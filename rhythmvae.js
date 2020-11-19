const Max = require('max-api');
const fs = require('fs')
const glob = require('glob');
const tf = require('@tensorflow/tfjs-node');
const { Midi } = require('@tonejs/midi'); // https://github.com/Tonejs/Midi
const path = require('path');


// Constants 
const MIDI_DRUM_MAP = require('./src/constants.js').MIDI_DRUM_MAP;
const DRUM_CLASSES = require('./src/constants.js').DRUM_CLASSES;
const NUM_DRUM_CLASSES = require('.//src/constants.js').NUM_DRUM_CLASSES;
const LOOP_DURATION = require('.//src/constants.js').LOOP_DURATION;
const MIN_ONSETS_THRESHOLD = require('./src/constants.js').MIN_ONSETS_THRESHOLD;
const NUM_MIN_MIDI_FILES = 64;

const ROWS = 30 // number of rows for UI matrix
const COLS = 30 // number of cols for UI matrix

// VAE model and Utilities
const utils = require('./src/utils.js');
const vae = require('./src/vae.js');

// This will be printed directly to the Max console
Max.post(`Loaded the ${path.basename(__filename)} script`);

// Global varibles
var train_data_onsets = []; 
var train_data_velocities = []; 
var train_data_timeshifts = [];
var isGenerating = false;

function isValidMIDIFile(midiFile){
    if (midiFile.header.tempos.length > 1){
        utils.error("not compatible with midi files containing multiple tempo changes")
        return false;
    }
    return true;
}

function getTempo(midiFile){
    if (midiFile.header.tempos.length == 0) return 120.0 // no tempo info, then use 120.0 
    return midiFile.header.tempos[0].bpm;  // use the first tempo info and ignore tempo changes in MIDI file
}

// Get location of a note in pianoroll
function getNoteIndexAndTimeshift(note, tempo){
    const unit = (60.0 / tempo) / 12.0; // the duration of 16th note
    const half_unit = unit * 0.5;

    const index = Math.max(0, Math.floor((note.time + half_unit) / unit)) // centering 
    const timeshift = (note.time - unit * index)/half_unit; // normalized

    return [index, timeshift];
}

function getNumOfDrumOnsets(onsets){
    var count = 0;
    for (var i = 0; i < NUM_DRUM_CLASSES; i++){
        for (var j=0; j < LOOP_DURATION; j++){
            if (onsets[i][j] > 0) count += 1;
        }
    }
    return count;
}

// Convert midi into pianoroll matrix
function processPianoroll(midiFile){
    const tempo = getTempo(midiFile);

    // data array
    var onsets = [];
    var velocities = [];
    var timeshifts = [];

    midiFile.tracks.forEach(track => {
    
        //notes are an array
        const notes = track.notes
        notes.forEach(note => {
            if ((note.midi in MIDI_DRUM_MAP)){
                let timing = getNoteIndexAndTimeshift(note, tempo);
                let index = timing[0];
                let timeshift = timing[1];

                // add new array
                while (Math.floor(index / LOOP_DURATION) >= onsets.length){
                    onsets.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                    velocities.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                    timeshifts.push(utils.create2DArray(NUM_DRUM_CLASSES, LOOP_DURATION));
                }

                // store velocity
                let drum_id = MIDI_DRUM_MAP[note.midi];

                let matrix = onsets[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = 1;    // 1 for onsets

                matrix = velocities[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = note.velocity;    // normalized 0 - 1
                
                // store timeshift
                matrix = timeshifts[Math.floor(index / LOOP_DURATION)];
                matrix[drum_id][index % LOOP_DURATION] = timeshift;    // normalized -1 - 1
            }
        })
    })
    
    /*    for debug - output pianoroll */
    // if (velocities.length > 0){ 
    //     var index = utils.getRandomInt(velocities.length); 
    //     let x = velocities[index];
    //     for (var i=0; i< NUM_DRUM_CLASSES; i++){
    //         for (var j=0; j < LOOP_DURATION; j++){
    //             Max.outlet("matrix_output", j, i, Math.ceil(x[i][j]));
    //         }
    //     }
    // }
    
    // 2D array to tf.tensor2d
    for (var i=0; i < onsets.length; i++){
        if (getNumOfDrumOnsets(onsets[i]) > MIN_ONSETS_THRESHOLD){
            train_data_onsets.push(tf.tensor2d(onsets[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_velocities.push(tf.tensor2d(velocities[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
            train_data_timeshifts.push(tf.tensor2d(timeshifts[i], [NUM_DRUM_CLASSES, LOOP_DURATION]));
        }
    }
}

function processMidiFile(filename){
    // // Read MIDI file into a buffer
    var input = fs.readFileSync(filename)

    var midiFile = new Midi(input);  
    if (isValidMIDIFile(midiFile) == false){
        utils.error("Invalid MIDI file: " + filename);
        return false;
    }

    var tempo = getTempo(midiFile);
    // console.log("tempo:", tempo);
    // console.log("signature:", midiFile.header.timeSignatures);
    processPianoroll(midiFile);
    // console.log("processed:", filename);
    return true;
}

// 1. Go to dir 
// 2. Read, validate, and count MIDI files
// 3. If ( count < NUM_MIN_MIDI_FILES ) { 
//     dup_factor = Math.ceil(NUM_MIN_MIDI_FILES / files.length)
// }


// Add training data
Max.addHandler("midi", (filename) =>  {
    var count = 0;
    // is directory? 
    if (fs.existsSync(filename) && fs.lstatSync(filename).isDirectory()){
        // iterate over *.mid or *.midi files 
        glob(filename + '**/*.+(mid|midi)', {}, (err, files)=>{
            utils.post("# of files in dir: " + files.length); 
            // compute data duplication factor 
            if ( files.length < NUM_MIN_MIDI_FILES ) { 
                dup_factor = Math.ceil(NUM_MIN_MIDI_FILES / files.length );
                utils.post("duplication factor: " + dup_factor); 
            } else { 
                dup_factor = 1; 
            }
            
            if (err) utils.error(err); 
            else {
                for (var idx in files){   
                    try {
                        for (i = 0; i < dup_factor; i++ ){
                            // apply data duplication 
                            if (processMidiFile(files[idx])) count += 1;
                        }
                    } catch(error) {
                        console.error("failed to process " + files[idx] + " - " + error);
                      }
                }
                utils.post("# of midi files added: " + count);    
                reportNumberOfBars();
            }
        })
    } else {
        if (processMidiFile(filename)) count += 1;
        Max.post("# of midi files added: " + count);    
        reportNumberOfBars();
    }
});

// Start training! 
Max.addHandler("train", ()=>{
    if (vae.isTraining()){
        utils.error_status("Failed to start training. There is already an ongoing training process.");
        return;
    }

    utils.log_status("Start training...");
    console.log("# of bars in training data:", train_data_onsets.length * 2);
    reportNumberOfBars();
    vae.loadAndTrain(train_data_onsets, train_data_velocities, train_data_timeshifts);
});

// Generate a rhythm pattern
Max.addHandler("generate", (z1, z2, threshold, noise_range = 0.0)=>{
    try {
        generatePattern(z1, z2, threshold, noise_range);
    } catch(error) {
        error_status(error);
    }
});

async function generatePattern(z1, z2, threshold, noise_range){
    if (vae.isReadyToGenerate()){    
      if (isGenerating) return;
  
      isGenerating = true;
      let [onsets, velocities, timeshifts] = vae.generatePattern(z1, z2, noise_range);
      Max.outlet("matrix_clear", 1); // clear all
      for (var i=0; i< NUM_DRUM_CLASSES; i++){
          var sequence = []; // for velocity
          var sequenceTS = []; // for timeshift
          // output for matrix view
          for (var j=0; j < LOOP_DURATION; j++){
              // if (pattern[i * LOOP_DURATION + j] > 0.2) x = 1;
              if (onsets[i][j] > threshold){
                Max.outlet("matrix_output", j + 1, i + 1, 1); // index for live.grid starts from 1
           
                // for live.step
                sequence.push(Math.floor(velocities[i][j]*127. + 1)); // 0-1 -> 0-127
                sequenceTS.push(Math.floor(utils.scale(timeshifts[i][j], -1., 1, 0, 127))); // -1 - 1 -> 0 - 127
              } else {
                sequence.push(0);
                sequenceTS.push(64);
              }
          }
  
          // output for live.step object
          Max.outlet("seq_output", i+1, sequence.join(" "));
          Max.outlet("timeshift_output", i+1, sequenceTS.join(" "));
      }
      Max.outlet("generated", 1);
      utils.log_status("");
      isGenerating = false;
  } else {
      utils.error_status("Model is not trained yet");
  }
}

// Clear training data 
Max.addHandler("clear_train", ()=>{
    train_data_onsets = []; // clear
    train_data_velocities = [];
    train_data_timeshift = [];  

    reportNumberOfBars();
});

Max.addHandler("stop", ()=>{
    vae.stopTraining();
});



async function createMatrix(path){

    // MATRIX 1
    // This matrix will store the values from latent space for a given (ROW, COL) 
    // resolution in the format that VAE provides. That is, for each (r e ROW) and (c e COL) 
    // i1_t1, i1_t2, ... , i1_tT (i.e., instrument 1 on time 1, ... )
    // i2_t1, i2_t2, ... , i2_tT
    // iI_t1, iI_t2, ... , iI_tT
    utils.log_status("Creating matrix1");
    let matrix = new Float32Array(ROWS*COLS*LOOP_DURATION*NUM_DRUM_CLASSES) 
    let normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        //   normalize samples to ±3. Inverse r allows start from [-3, 3] instead of [-3, -3]
        let r_norm = normalize(r, ROWS, 3) * -1   
        let c_norm = normalize(c, COLS, 3)        
        let [onsets, velocities, timeshifts] = vae.generatePattern(c_norm, r_norm, 0);
        for (let i = 0; i < NUM_DRUM_CLASSES; i++) {
            // This iterates over instruments, columns, and rows, given a loop duration length. If NUM_DRUM_CLASSES and LOOP_DURATION are one, the iteration increases one by one over columns and rows.
            matrix.set(onsets[i], ((COLS * r + c) * NUM_DRUM_CLASSES + i) * LOOP_DURATION )
            // console.log(r,c,i, onsets[i])    
          }
      }
    } 

    // fs.writeFileSync(path+'-matrix.data', matrix)
    fs.writeFileSync(path+'-matrix-LS.data', matrix)


    // MATRIX 2
    // This matrix stores the values from latent space to facilitate rendering
    // an image. That is, the outer loop is time, inside each moment we see an image:
    // i1_c0_r0, i2_c0_r0, ...,  i1_c1_r0, i2_c1_r0
    // i3_c0_r0, i4_c0_r0, ...,  i3_c1_r0, i3_c1_r0
    // i1_c0_r1, i2_c0_r1, ...,  i1_c1_r1, i2_c1_r1
    // i3_c0_r1, i4_c0_r1, ...,  i3_c1_r1, i3_c1_r1
    
    // utils.log_status("Creating matrix2");


    let matrix2 = new Float32Array(ROWS*COLS*LOOP_DURATION*NUM_DRUM_CLASSES) 

    let counter = 0;
    let instSide = Math.sqrt(NUM_DRUM_CLASSES)
    for (let t = 0; t < LOOP_DURATION; t++) {
        for (let r = 0; r < ROWS; r++) {
            for (let i2 = 0; i2 < instSide; i2++) {
                for (let c = 0; c < COLS; c++) {
                    for (let i1 = 0; i1 < instSide; i1++) {
                        let pos = ( i1 * LOOP_DURATION  ) + 
                                ( c * NUM_DRUM_CLASSES * LOOP_DURATION ) + 
                                ( i2 * LOOP_DURATION * instSide  ) +  
                                ( r * NUM_DRUM_CLASSES * LOOP_DURATION * COLS ) + 
                                t
                        matrix2[counter] = matrix[pos]
                        // console.log(counter, pos)
                        counter++
                    }
                }
            }
        }
    }

    fs.writeFileSync(path+'-matrix-vis.data', matrix2)
    

    // Read the matrix just created using floats, and create a matrix using UInt8ClampedArray with bigger dots.
    // const Px = 10 // scaling value for each pixel
    // let matrix3 = new Uint8ClampedArray(COLS*ROWS*4*4*Px*Px)
    // function fillI(r, ROWS, c, COLS, val, Px, rNi) {
    //     for(let i_y = 0; i_y < rNi; i_y++) {
    //         for(let i_x = 0; i_x < rNi; i_x++) {
    //             for(let x = 0; x < Px; x++) {
    //                 for(let y = 0; y < Px; y++) {
    //                     if (i_x == 0) { matrix3[r*4+y, i_x*4+y] = [val*255, 0, 0, 255]}
    //                     if (i_x == 1) matrix3[r*4+y, i_x*4+y] = [0, val*255, 0, 255]
    //                     if (i_x == 2) matrix3[r*4+y, i_x*4+y] = [0, 0, val*255, 255]
    //                 }
    //             }
    //         }
    //     }
    // }
    
    // for(let r = 0; r < ROWS; r++) {
    //     for(let c = 0; c < COLS; c++) {
    //         let val = matrix2[r * COLS + c]
    //         fillI(r, ROWS, c, COLS, val, Px, Math.sqrt(NUM_DRUM_CLASSES))
    //     }
    // }

    return "Matrices saved!"
  }
  


Max.addHandler("savemodel", (path)=>{
    // check if already trained or not
    if (vae.isReadyToGenerate()){

        // filepath = "file://" + path;
        // vae.saveModel(filepath);
        // utils.log_status("Model saved.");

 

        filepath = "file://" + path;
        vae.saveModel(filepath).then(result => {
            utils.log_status('Model result was: ', result);
            console.log('Model result was: ', result);
            createMatrix(path).then(result => {
                utils.log_status('Matrix result was: ', result);
                console.log('Matrix result was: ', result);
            })      
        })

 

    } else {
        utils.error_status("Train a model first!");
    }
});

Max.addHandler("loadmodel", (path)=>{
    filepath = "file://" + path;
    vae.loadModel(filepath);
    utils.log_status("Model loaded!");
});

Max.addHandler("epochs", (e)=>{
    vae.setEpochs(e);
    utils.post("number of epochs: " + e);
});


let visualizerMatrix
Max.addHandler("loadspace", () => {
    let folder = "/Users/gabriel/Documents/3_GitHub/R-VAE"
    let visPath = "/LS-1.data";
    console.log(path.join(folder,visPath));
    fs.readFile(path.join(folder,visPath), (err, buf) => {
        if (err) throw err;
        visualizerMatrix = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength/4);
        utils.post("vis matrix:" + visualizerMatrix.slice(0,10));
    })
})


function reportNumberOfBars(){
    Max.outlet("train_bars", train_data_onsets.length * 2);  // number of bars for training
}