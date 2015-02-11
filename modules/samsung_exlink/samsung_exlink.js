var EventEmitter = require('events').EventEmitter;
var util = require('util');
var net = require('net');

// Controls a Samsung TV via the EX.Link service port, attached via a
// GlobalCache IP2SL adapter. 
function SamsungEXLink(data) {
  this.host = data.host;

  this.commands = {};
  this.commands.Off = [0x8,0x22,0x0,0x0,0x0,0x1,0xd5];
  this.commands.On = [0x8,0x22,0x0,0x0,0x0,0x2,0xd6];
  this.commands.VolumeUp = [0x8,0x22,0x1,0x0,0x1,0x0,0xd4];
  this.commands.VolumeDown = [0x8,0x22,0x1,0x0,0x2,0x0,0xd3];
  this.commands.Mute = [0x8,0x22,0x2,0x0,0x0,0x0,0xd4];
  this.commands.InputHDMI1 = [0x8,0x22,0xa,0x0,0x5,0x0,0xc7];
  this.commands.InputHDMI2 = [0x8,0x22,0xa,0x0,0x5,0x1,0xc6];
  this.commands.InputHDMI3 = [0x8,0x22,0xa,0x0,0x5,0x2,0xc5];
  this.commands.InputHDMI4 = [0x8,0x22,0xa,0x0,0x5,0x3,0xc4];
  this.commands.InputTVTuner = [0x8,0x22,0xa,0x0,0x0,0x0,0xcc];

  this.commandQueue = [];

  this.connect();
};
util.inherits(SamsungEXLink, EventEmitter);
 
SamsungEXLink.prototype.PORT = 4999;

SamsungEXLink.prototype.connect = function() {
  this._reconnecting = false;
  console.log("ExLink: " + this.host);
  this.client = net.connect({ host: this.host, port: this.PORT });
  this.client.on('error', this.handleError.bind(this));
  this.client.on('close', this.handleError.bind(this));
}

SamsungEXLink.prototype.handleError = function(error) {
  console.log("SamsungEXLink.Error: " + error);
  setTimeout(this.reconnect.bind(this), 10000);
}

SamsungEXLink.prototype.reconnect = function() {
  if (this._reconnecting)
    return;
  this._reconnecting = true;
  setTimeout(this.connect.bind(this), 1000);
}

SamsungEXLink.prototype.send = function(buf) {
  var isFirstRequest = (this.commandQueue.length == 0);
  this.commandQueue.push(buf);
  if (isFirstRequest)
    setTimeout(this.sendNextCommand.bind(this), 10); // nextTick is not behaving correctly
};

SamsungEXLink.prototype.sendNextCommand = function() {
  if (!this.commandQueue.length) return;
  var buf = this.commandQueue.shift();
  console.log(this.host + "> ", buf.join(","));
  this.client.write(new Buffer(buf), undefined, function () {
    setTimeout(this.sendNextCommand.bind(this), 300);  
  }.bind(this));
};

SamsungEXLink.prototype.exec = function(command) {
  console.log("*  SamsungEXLink Executing: " + command);

  if (command in this.commands) {
    this.send(this.commands[command]);
    this.emit("DeviceEvent", command);
  }
};

module.exports = SamsungEXLink;