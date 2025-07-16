class OpenAI {
  constructor() {
    this.images = {
      generate: jest.fn()
    };
  }
}

module.exports = OpenAI;
module.exports.default = OpenAI;