const details = () => ({
  id: 'Tdarr_Plugin_pyvd_restructure_audio_streams',
  Stage: 'Pre-processing',
  Name: 'pyrovader - Restructure audio streams given a json-described structure.',
  Type: 'Audio',
  Operation: 'Transcode',
  Description: '[Contains built-in filter]  If the file has surround sound tracks not in ac3,'
    + ` they will be converted to ac3. \n\n
`,
  Version: '1.00',
  Tags: 'pre-processing,ffmpeg,audio only,',
  Inputs: [
    {
      name: 'audio_structure',
      type: 'string',
      defaultValue: '[{}]',
      inputUI: {
        type: 'text',
      },
      tooltip: 'Specify if you\'d like to overwrite the existing track or keep'
        + 'it and have a new stream be created (default: true)',
    },
  ],
});

// eslint-disable-next-line no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  const response = {
    processFile: false,
    preset: '',
    container: `.${file.container}`,
    handBrakeMode: false,
    FFmpegMode: true,
    reQueueAfter: false,
    infoLog: '',
  };

  // Check if file is a video. If it isn't then exit plugin.
  if (file.fileMedium !== 'video') {
    // eslint-disable-next-line no-console
    console.log('File is not video');
    response.infoLog += '☒File is not video \n';
    response.processFile = false;
    return response;
  }

  // Check if inputs.audio_structure has been configured. If it hasn't then exit plugin.
  if (inputs.audio_structure === '[{}]') {
    response.infoLog += '☒Audio structure option not set, please configure required options. Skipping this plugin.  \n';
    response.processFile = false;
    return response;
  }

  // Set up required variables.
  const audio_structure = JSON.parse(inputs.audio_structure);
  let ffmpegCommandInsert = '';
  let convert = false;
  let audioIdx = 0;
  let audioStreamsRemoved = 0;
  const audioStreamCount = file.ffProbeData.streams.filter(
    (row) => row.codec_type.toLowerCase() === 'audio',
  ).length;

  if (inputs.overwriteTracks === false) {
    const hasAc3_6Stream = file.ffProbeData.streams.filter((row) => row.channels === 6
      && row.codec_name === 'ac3');
    if (hasAc3_6Stream.length > 0) {
      convert = false;
    }
  }

  for (let i = 0; i < file.ffProbeData.streams.length; i += 1) {
    const currStream = file.ffProbeData.streams[i];
    try {
      if (currStream.codec_type.toLowerCase() === 'audio') {
        audioIdx += 1;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }

    try {
      if (
        currStream.channels === 6
        && currStream.codec_name !== 'ac3'
        && currStream.codec_type.toLowerCase() === 'audio'
      ) {
        if (inputs.overwriteTracks === true) {
          ffmpegCommandInsert += ` -c:a:${audioIdx} ac3 `;
        } else {
          ffmpegCommandInsert += `-map 0:a:${audioIdx} -c:a:${audioIdx} ac3 `;
        }
        hasnonAC3SurroundTrack = true;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  }

  const ffmpegCommand = `,-map 0 -c:v copy  -c:a copy ${ffmpegCommandInsert} -c:s copy -c:d copy`;

  if (convert && hasnonAC3SurroundTrack === true) {
    response.processFile = true;
    response.preset = ffmpegCommand;
    response.container = `.${file.container}`;
    response.handBrakeMode = false;
    response.FFmpegMode = true;
    response.reQueueAfter = true;
    response.infoLog += '☒ File has surround audio which is NOT in ac3! \n';
    return response;
  }
  response.infoLog += '☑ All surround audio streams are in ac3! \n';

  response.infoLog += '☑File meets conditions! \n';
  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
