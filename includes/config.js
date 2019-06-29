'use strict';

function isDebug(){
  try {
    require.resolve('./env');
    return true;
  } catch(e){}
  return false;
}

var env;
if(isDebug()){
  env = require('./env');
} else {
  env = process.env;
}

module.exports = {
  debug: isDebug(),
  port: env.PORT || 5000
};
