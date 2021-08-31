const fs = require('fs')
const path = require('path')


const { validationResult } = require('express-validator')

const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')
const user = require('../models/user')



const clearImage = (filePath) => {
   filePath = path.join(__dirname, '..', filePath)
   fs.unlink(filePath, (err) => {
      if (err) {
         throw (err);
      }
   })
}
exports.getPosts = async (req, res, next) => {

   const currentPage = req.query.page || 1;
   const perPage = 2;

   let totalItems;

   try {
      totalItems = await Post.find().countDocuments()
      const posts = await Post.find().populate('creator').sort({createdAt: -1}).skip(perPage * (currentPage - 1)).limit(perPage)

      if (!posts) {
         const error = new Error('Could not find posts.')
         error.statusCode = 404;
         throw error
      }

      res.status(200).json({
         message: 'Fetched Posts succesfully',
         posts: posts,
         totalItems: totalItems
      });

   } catch (err) {
      if (!err.statusCode) {
         err.statusCode = 500;
      }
      next(err);
   }


};

/* exports.getPosts = (req, res, next) => {

   const currentPage = req.query.page || 1;
   const perPage = 2;

   let totalItems;

   Post.find().countDocuments()
      .then(count => {
         totalItems = count

         return Post.find()
         .skip(perPage * (currentPage -1))
         .limit(perPage)

      })
      .then(posts => {
         if (!posts) {
            const error = new Error('Could not find posts.')
            error.statusCode = 404;
            throw error
         }

         res.status(200).json({
            message: 'Fetched Posts succesfully',
            posts: posts,
            totalItems: totalItems

         });
      })
      .catch(err => {
         if (!err.statusCode) {
            err.statusCode = 500;
         }

         next(err);
      })
}; */

exports.createPost = (req, res, next) => {
   const errors = validationResult(req);


   if (!errors.isEmpty()) {

      const error = new Error('Validation failed, entered data is incorrect.')
      error.statusCode = 422;
      throw error
   }

   if (!req.file) {
      const error = new Error('No Image Provided')
      error.statusCode = 422;
      throw error
   }

   const title = req.body.title;
   const content = req.body.content;
   const imageUrl = req.file.path.replace("\\", "/");

   const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId,
   });

   post.save()
      .then(result => {
         return User.findById(req.userId)
      })
      .then(user => {
         creator = user
         user.posts.push(post);
         return user.save()
      })
      .then(result => {
         io.getIO().emit('posts', {action: 'create', post: {...post._doc, creator: {_id: req.userId, name: user.name}}})
         return result
      })
      .then(result => {
         res.status(201).json({
            message: 'Post created successfully!',
            post: post,
            creator: { _id: creator._id, name: creator.name }
         });
      })
      .catch(err => {
         if (!err.statusCode) {
            err.statusCode = 500;
         }

         next(err);

      });
};


exports.getPost = (req, res, next) => {

   const postId = req.params.postId;

   Post.findById(postId)
      .then(post => {
         if (!post) {
            const error = new Error('Could not find post.')
            error.statusCode = 404;
            throw error
         }

         res.status(200).json({
            message: 'Post fetched',
            post: post
         })

      })
      .catch(err => {
         if (!err.statusCode) {
            err.statusCode = 500;
         }

         next(err);
      })

}

exports.updatePost = (req, res, next) => {

   const errors = validationResult(req);



   if (!errors.isEmpty()) {
      const error = new Error('Validation failed, entered data is incorrect.')
      error.statusCode = 422;
      throw error
   }

   const postId = req.params.postId;
   const title = req.body.title;
   const content = req.body.content;
   let imageUrl = req.body.image

   if (req.file) {
      imageUrl = req.file.path.replace("\\", "/");
   }

   if (!imageUrl) {
      const error = new Error('No file picked')
      error.statusCode = 422;

      throw error
   }


   Post.findById(postId).populate('creator')
      .then(post => {
         if (!post) {
            const error = new Error('Could not find post.')
            error.statusCode = 404;
            throw error
         }

         if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not Authorised.')
            error.statusCode = 403;
            throw error
         }

         if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl)
         }

         post.title = title;
         post.imageUrl = imageUrl;
         post.content = content


         return post.save();

      })
      .then(updatedPost => {
         io.getIO().emit('posts', { action: 'update', post:    updatedPost})
         return updatedPost
      })
      .then(updatedPost => {
         res.status(200).json({
            message: 'Post updated successfully',
            post: updatedPost
         })
      })
      .catch(err => {
         if (!err.statusCode) {
            err.statusCode = 500;
         }

         next(err);
      })

}

exports.deletePost = (req, res, next) => {


   const postId = req.params.postId;

   let deletedPoste;

   Post.findById(postId)
      .then(post => {

         if (!post) {
            const error = new Error('Could not find post.')
            error.statusCode = 404;
            throw error
         }

         if (post.creator.toString() !== req.userId) {
            const error = new Error('Not Authorised.')
            error.statusCode = 403;
            throw error
         }
         //Check Logged in user

         clearImage(post.imageUrl)

         return Post.findByIdAndRemove(postId);

      })
      .then(deletedPost => {
         deletedPoste = deletedPost
         return User.findById(req.userId);
      })
      .then(user => {
         user.posts.pull(postId)
         return user.save()
      })
      .then(result => {
         io.getIO().emit('posts', {action: 'delete', post: postId})
         return result
      })
      .then(result => {
         res.status(200).json({
            message: 'Post deleted successfully',
            post: deletedPoste
         })
      })
      .catch(err => {
         if (!err.statusCode) {
            err.statusCode = 500;
         }

         next(err);
      })

}
