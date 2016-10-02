const Neuralist = require('../');
const fs = require('fs');
const csv = require('csv');
const redis = require('redis');

describe('Neuralist', function() {
  this.timeout(10000);

  let csvData = [];
  let neuralist;
  let redisClient;

  before((done) => {
    let parser = csv.parse((err, data) => {
      for (let i = 1; i < data.length; i++) {
        let number1 = parseInt(data[i][0]);
        let number2 = parseInt(data[i][1]);
        let result = parseInt(data[i][2]);

        let input = {
          number1,
          number2
        };

        let output = {
          result
        };

        csvData.push([input, output]);
      }

      console.log('DATA: ', csvData);
      done();
    });

    fs.createReadStream(__dirname+'/datasets/addition.csv').pipe(parser);
  });

  beforeEach((done) => {
    redisClient = redis.createClient();

    neuralist = new Neuralist({
      name: 'additions',
      type: 'regressor',
      inputs: ['number1', 'number2'],
      outputs: ['result'],
      hiddenLayers: [3],
      datasetSize: 50,
      testsetSize: 10,
      redisClient: redisClient
    });

    neuralist.create().then(() => done());
  });

  afterEach(() => {
    neuralist.delete();
  });

  it('should allow training', () => {
    let promises = [];
    let traningDataSet = csvData.slice(0, 90);
    let testDataSet;

    for (let i = 0; i < traningDataSet.length; i++) {
      let input = traningDataSet[i][0];
      let output = traningDataSet[i][1];

      promises.push(neuralist.observe_train(input, output));
    }

    return Promise.all(promises)
      .then(() => {
        let promises = [];

        testDataSet = csvData.slice(90);

        for (let i = 0; i < testDataSet.length; i++) {
          let input = testDataSet[i][0];
          let output = testDataSet[i][1];

          promises.push(neuralist.observe_test(input, output));
        }

        return Promise.all(promises);
      })
      .then(() => {
        return neuralist.train();
      })
      .then(() => {
        let promises = [];
        let errors = 0;

        for (let i = 0; i < testDataSet.length; i++) {
          let input = testDataSet[i][0];
          let output = testDataSet[i][1];

          promises.push(neuralist.run(input));
        }

        return Promise.all(promises);
      });
  });
});
