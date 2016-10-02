const observeByTypeHandlers = {
  regressor(neuralist, args, input, output, mode) {
    neuralist.outputs.forEach((nOutput) => {
      let outputArg = output[nOutput];

      if (Array.isArray(outputArg)) {
        args.push(...outputArg);
      } else {
        args.push(outputArg);
      }
    });
  }
};

function _observe(neuralist, input, output, mode) {
  let args = [neuralist.name];

  neuralist.inputs.forEach((nInput) => {
    let inputArg = input[nInput];

    if (Array.isArray(inputArg)) {
      args.push(...inputArg);
    } else {
      args.push(inputArg);
    }
  });

  args.push('->');

  let handler;
  if ((handler = observeByTypeHandlers[neuralist.type])) {
    handler(neuralist, args, input, output, mode);
  } else {
    let clsType = 0;

    for (let i = 0; i < this.outputs.length; i++) {
      let name = this.outputs[i];
      if (output[name]) {
        clsType = i;
        break;
      }
    }

    args.push(clsType);
  }

  args.push(mode);

  return new Promise((resolve, reject) => {
    neuralist.redisClient.send_command('nr.observe', args, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

class Neuralist {
  constructor(options) {
    let prefix = options.prefix || 'nn:';

    this.name = prefix + options.name;
    this.type = options.type;
    this.inputs = options.inputs;
    this.outputs = options.outputs;
    this.hiddenLayers = options.hiddenLayers;
    this.normalize = options.normalize;
    this.datasetSize = options.datasetSize;
    this.testsetSize = options.testsetSize;
    this.redisClient = options.redisClient;
  }

  info() {
    return new Promise((resolve, reject) => {
      this.redisClient.send_command('nr.info', [this.name], (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }

  run(input) {
    let args = [this.name];

    this.inputs.forEach((nInput) => {
      let inputArg = input[nInput];

      if (Array.isArray(inputArg)) {
        args.push(...inputArg);
      } else {
        args.push(inputArg);
      }
    });

    return new Promise((resolve, reject) => {
      this.redisClient.send_command('nr.run', args, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }

  classify(input) {
    let args = [this.name];

    this.inputs.forEach((nInput) => {
      let inputArg = input[nInput];

      if (Array.isArray(inputArg)) {
        args.push(...inputArg);
      } else {
        args.push(inputArg);
      }
    });

    return new Promise((resolve, reject) => {
      this.redisClient.send_command('nr.class', args, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }

  create() {
    let args = [
      this.name,
      this.type,
      this.inputs.length
    ];

    args.push.apply(args, this.hiddenLayers);
    args.push('->', this.outputs.length);

    if (this.normalize) {
      args.push('NORMALIZE');
    }

    args.push('DATASET', this.datasetSize);
    args.push('TEST', this.testsetSize);

    return new Promise((resolve, reject) => {
      this.redisClient.send_command('nr.create', args, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }

  delete() {
    this.redisClient.del(this.name);
  }

  observe_train(input, output) {
    return _observe(this, input, output, 'train');
  }

  observe_test(input, output) {
    return _observe(this, input, output, 'test');
  }

  train(options) {
    options = options || {};

    let {
      maxCycles,
      maxTime,
      autostop,
      backtrack
    } = options;

    let args = [this.name];

    if (maxCycles) {
      args.push('MAXCYCLES', maxCycles);
    }

    if (maxTime) {
      args.push('MAXTIME', maxTime);
    }

    if (autostop) {
      args.push('AUTOSTOP');
    }

    if (backtrack) {
      args.push('BACKTRACK');
    }

    return new Promise((resolve, reject) => {
      this.redisClient.send_command('nr.train', args, (err, res) => {
        return err ? reject(err) : resolve(res);
      });
    });
  }
}

module.exports = Neuralist;
