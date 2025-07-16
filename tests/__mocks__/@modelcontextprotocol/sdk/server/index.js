class Server {
  constructor() {
    this.setRequestHandler = jest.fn();
    this.connect = jest.fn();
  }
}

module.exports = { Server };