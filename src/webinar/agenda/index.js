const Agenda = require('agenda');

let agenda = new Agenda({
    db: {
      address: process.env.MONGO_URI,
      options: {
        useNewUrlParser: true,useUnifiedTopology: true
      },
    },
  });


const WebinarController = require('../routes/webinar/WebinarController');

agenda.define('webinarAutoComplete', { priority: 'high', concurrency: 1 }, async function (job, done) {
  console.log("webinarAutoComplete",job.attrs.data)
  let jobData = job.attrs.data;
  let { webinarId } = jobData;

  console.log({webinarId})

  WebinarController.webinarAutoComplete({
    webinarId
  })

  done()
})

agenda.define('startComposition', { priority: 'high', concurrency: 1 }, async function (job, done) {
  console.log("startComposition",job.attrs.data)
  let jobData = job.attrs.data;
  let { webinarId } = jobData;

  console.log({webinarId})

  WebinarController.startComposition({
    webinarId
  })

  done()
})


agenda.define( "scheduleUserInform",{ priority: 'high', concurrency: 1 }, async (job, done) =>{
    try{
      let jobData = job.attrs.data;
      console.log("job.attrs.data", job.attrs.data)
      let { webinarId, } = jobData;
      await WebinarController.sendInform( {webinarId} )
      done();
    } catch (err) {
      console.log(err)
      done()
    }
  })

  agenda.on('complete', function (job) {
    job.remove();
  });

module.exports = agenda;