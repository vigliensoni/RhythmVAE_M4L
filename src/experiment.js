const utils = require('./utils.js');
const Max = require('max-api');
const fs = require('fs')

let COLS = require('./constants.js').COLS;
let ROWS = require('./constants.js').ROWS;
let LOOP_DURATION = require('./constants.js').LOOP_DURATION;
let NUM_DRUM_CLASSES = require('./constants.js').NUM_DRUM_CLASSES;

// ROWS=1;
// COLS=1;
// LOOP_DURATION=1;
// NUM_DRUM_CLASSES=1;


const INST_SIDE = Math.sqrt(NUM_DRUM_CLASSES); // 3,  SIDE OF THE INSTRUMENT CUBE
const Px = 1; // SCALING FACTOR, 10 for WEB, 1 for MAXMSP
const height = ROWS * INST_SIDE * Px;
const width = COLS * INST_SIDE * Px;
const matlength = NUM_DRUM_CLASSES * LOOP_DURATION * COLS * ROWS;

// utils.post("matlength:" + matlength);

const vae = require('./vae.js');

let matrix = new Float32Array(matlength);  // original LS sampled




// async function generateVisualization(model) {
//   utils.post('Generate visualization:' + model)
// }

function sampleSpace(){

  // MATRIX 1
  // This matrix will store the values from latent space for a given (ROW, COL) 
  // resolution in the format that VAE provides. That is, for each (r e ROW) and (c e COL) 
  // i1_t1, i1_t2, ... , i1_tT (i.e., instrument 1 on time 1, ... )
  // i2_t1, i2_t2, ... , i2_tT
  // iI_t1, iI_t2, ... , iI_tT


  let normalize = (x, max, scaleToMax) => (x/max - 0.5) * 2 * scaleToMax

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      //   normalize samples to ±3. Inverse r allows start from [-3, 3] instead of [-3, -3]
      let r_norm = normalize(r, ROWS, 3) * -1   
      let c_norm = normalize(c, COLS, 3)        
      let [onsets, velocities, timeshifts] = vae.generatePattern(c_norm, r_norm, thres=0);
      // utils.post("onsets:"+onsets[0]);

      for (let i = 0; i < NUM_DRUM_CLASSES; i++) {
          // This iterates over instruments, columns, and rows, given a loop duration length. 
          // If NUM_DRUM_CLASSES and LOOP_DURATION are one, the iteration increases one by one over columns and rows.
          matrix.set(onsets[i], ((COLS * r + c) * NUM_DRUM_CLASSES + i) * LOOP_DURATION )
        }
    }
  } 

  
  // utils.post("2");
  // utils.post(JSON.stringify(matrix));
  // utils.post("3");
  // utils.post(matrix);
  // utils.post("4");
  
  path = "./";
  
  fs.writeFileSync(path+'matrix1.data', matrix);




}


exports.sampleSpace = sampleSpace;


