# R-VAE

Rhythm generator using Variational Autoencoder(VAE) as a Max for Live (M4L) plugin

This is a fork of [M4L.RhythmVAE by Nao Tokui](https://github.com/naotokui/RhythmVAE_M4L), modded and extended to support simple and compound meter rhythms, with minimal amount of training data.

Similarly to RhythmVAE, the goal of R-VAE is the exploration of latent spaces of musical rhythms. Unlike most previous work in rhythm modeling, R-VAE can be trained with small datasets, enabling rapid customization and exploration by individual users. R-VAE employs a data representation that encodes simple and compound meter rhythms. To the best of our knowledge, this is the first time that a network architecture has been used to encode rhythms with these characteristics, which are common in some modern popular music genres.

## Improvements

- Modeling of simple and compound meter rhythms, achieved by improving the resolution from 4 to 24 ppqn (pulser per quarter note)
- Playback head latent space can be controlled from any mappable parameter in Ableton Live
- `Reset` button allows to reset the sequence to 1.1.0
- If little training data is provided, the data is duplicated to achieve a minimum number of clips so that they can be processed by the network, and the loss decreases
- Synchronization to Ableton Live and Max Transport Control is improved
- `Shuffle` variable was refactored
- Toggle for fix or variable velocity was added
- Implement a hack to avoid inconsistencies between versions of `tfjs_binding.node` under different folder structures. See [this](https://github.com/vigliensoni/R-VAE/issues/2)
- Models of footwork and trap learned with as little as 12 clips can be downloaded [from here](https://github.com/vigliensoni/R-VAE-JS/tree/master/dist/data)
- A 30 * 30 matrix is generated based on the latent space. That is, the continuous latent space is sampled and the sequences of onsets per instrument are stored in a matrix.
- XY grid receives and sends OSC messages. The ports used are the Wekinator defaults (12000 and 6448)



## Generating a M4L device

- Make sure to open the `*.maxproj` project file. Then in the Project Inspector set *Max for Live Device Type* to “MIDI.“
- Choose *Export Max for Live Device*
- Don't forget to add to the `Search Paths` in `Project Settings` everything you need to include in your distribution (e.g., .maxpat files, .js files, node modules, etc.)
- Get your M4L device from the `/release` folder
- Play!

## Requirements

- macOS >= 10.12.x (due to `clock_gettime` requirements of libtensorflow)
