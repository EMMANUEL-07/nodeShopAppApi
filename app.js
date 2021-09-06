const path = require('path')

const express = require("express")
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const multer = require('multer')
const axios = require('axios')
const graphql = require('express-graphql')

require('dotenv').config()

const graphqlSchema = require('./graphql/schema')
const graphqlResolver = require('./graphql/resolvers')

const auth = require('./middleware/auth')

const app = express()

const password = process.env.MONGOOSE_KEY
const PORT = process.env.PORT

const MONGODB_URI = `mongodb+srv://Emmanuel:${password}@emmanuellearn.2fofu.mongodb.net/postBlog?retryWrites=true&w=majority`

const fileStorage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'images');
   },
   filename: (req, file, cb) => {
      cb(null, new Date().toISOString().replace(/:/g, '-') + '-' + file.originalname);
   }
})


const fileFilter = (req, file, cb) => {
   if (
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/jpeg'
   ) {
      cb(null, true);
   } else {
      cb(null, false);
   }
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
   multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)
app.use('/images', express.static(path.join(__dirname, 'images'))); // static rendering for images


app.use((req, res, next) => {
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
   // res.setHeader('Access-Control-Allow-Headers', '*');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
   if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
  }

   next();

})

/* 
app.use('/feed', feedRoutes)
app.use('/auth', authRoutes) */

app.put('/post-image', (req, res, next) => {
   if(!req.file){
      return res.status(200).json({message: 'No file provided'})
   }
})

app.use(auth)

app.use('/graphql', graphql.graphqlHTTP({
   schema: graphqlSchema,
   rootValue: graphqlResolver,
   graphiql: true,
   formatError(err) {
      if(!err.originalError) {
         return err;
      }

      const data = err.originalError.data;
      const message = err.message || 'An error occured'
      const code = err.originalError.code || 500;

      return { message: message, status : code, data: data}
   }
}))

app.use((error, req, res, next) => {
   console.log(error)
   const status = error.statusCode || 500;
   const message = error.message

   res.status(status).json({ message: message })

})

mongoose
   .connect(MONGODB_URI)
   .then(result => {
      app.listen(PORT || 8080, () => {
         console.log("Application started and Listening on port 3000")
      })
      /* const server = app.listen(PORT || 8080) 
      const server = app.listen(8080)
      const io = require('./socket').init(server);

      io.on('connection', socket => {
         console.log('Client Connected')
      })*/
   })
   .catch(err => {
      console.log(err);
   });