'use strict';

/**
 * Module dependencies.
 */
var path = require('path'),
    errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
    mysql = require('mysql'),
    async = require('async');

var dbconfig = require('../../../../db');
var connection = mysql.createConnection(dbconfig.connection);
connection.query('USE ' + dbconfig.database);

exports.getVideos = function(req, res) { 

    //connection.query('SELECT * FROM uploads WHERE state = "finished"', function(err, media) {
    var query = "SELECT *, (select count(count) from likes l where l.video_id=u.id and count=1) as likcount, (select count(dislike_count) from likes li  where li.video_id=u.id and dislike_count=1) as dislikcount, (select username from users where id=u.userId) as user, (select isReddit from users where id=u.userId) as isReddit, (select count(view_count) from views where video_id=u.v_id) as viewcount from uploads u  where u.state='finished' and isPrivate != 1 and nsfw=0 and isDelete=0 and Active=1" ;
      //console.log('query not in session', query);
      connection.query(query, function(err, media) {

        if (!err) {
            if (req.session.user && req.session.user.is_nsfw==1) { 
                query = "SELECT *, (select count(count) from likes l where l.video_id=u.id and count=1) as likcount, (select count(dislike_count) from likes li  where li.video_id=u.id and dislike_count=1) as dislikcount, (select username from users where id=u.userId) as user, (select isReddit from users where id=u.userId) as isReddit, (select count(view_count) from views where video_id=u.v_id) as viewcount from uploads u  where u.state='finished' and isDelete=0 and Active=1 and nsfw=1 and  isPrivate!=1";
                connection.query(query, function(err, media1) {

                    var total = media.concat(media1);
                    if (media1 != null) {
                        return res.status(200).json({
                            "total": total,
                        });
                    }
                })
            } else {
                return res.status(200).json({
                    "total": media,
                });
            }
        } else {
            return res.status(204).json({
                message: "No Result found"
            });
        }
    });
};

exports.allUserVedioAndInfo = function(req, res) {
    
    var type = "",
        userid;
    if (req.query && req.query.type) {
        type = req.query.type;
    }
    if (req.query && req.query.id) {
        userid = parseInt(req.query.id);
    }

    var query;
    if (userid!=0) {
        
        query = "SELECT *,(select count(count) from likes where video_id=u.id and count=1) as likecount,(select count(dislike_count) from likes where video_id=u.id and dislike_count=1) as dislikecount, (select username from users where id=u.userId) as user, (select count(view_count) from views where video_id=u.v_id) as viewscount  FROM uploads u WHERE u.userId=" + userid + "";
        getuserdata(query, function(media) {
           return res.status(200).send(media);
        });
    } else {

        if (type == "reddit") {
           
            query = "SELECT id from users where username='" + req.params.user + "' and isReddit=1";
        } else {
            
            query = "SELECT id from users where username='" + req.params.user + "'";
            }
            connection.query(query, function(err, userid) {
               
                if (!err) {
                      query = "SELECT *,(select count(count) from likes where video_id=u.id and count=1) as likecount,(select count(dislike_count) from likes where video_id=u.id and dislike_count=1) as dislikecount, (select username from users where id=u.userId) as user, (select count(view_count) from views where video_id=u.v_id) as viewscount  FROM uploads u WHERE isPrivate != 1 and u.userId=" + userid[0].id + "";
                     getuserdata(query, function(media) {
           return res.status(200).send(media);
        });
                } else {
                  

                }
            })


        
    }

}

// if(req.session.user) {

//    }else {
//  
// }



 function getuserdata(query, callback) {
    
    connection.query(query, function(err, media) {
       
        if (!err && media) {

            callback(media);
        } else {
            'Media does not exists!'
        }
    });
}


exports.updatevalue = function(req, res) {
    connection.query('UPDATE uploads SET isPrivate = ' + req.body.isPrivate + ' WHERE id =' + req.body.videoId, function(err, response) {
        if (response) {
            return res.send('Updated successfully!');
        }
    });
}

exports.play = function(req, res) {
    
    connection.query("SELECT *,(select count(count) from likes where video_id=u.id and count=1) as likecount,(select count(dislike_count) from likes where video_id=u.id and dislike_count=1) as dislikecount, (select username from users where id=u.userId) as user, (select count(view_count) from views where video_id=u.v_id) as viewscount  FROM uploads u WHERE u.v_id='" + req.params.id + "'", function(err, media) {

        if (!err && media) {
            return res.status(200).send(media);
        } else {
            return res.status(204).send({
                message: "Media Doenot Exist"
            });
        }
    });
};


exports.addComments = function(req, res) {
    if(req.body.v_id) {
        connection.query('SELECT id FROM uploads WHERE v_id ="'+req.body.v_id+'"', function(err, videoId) {
            if(videoId != undefined) {
            var today = new Date();
            var queryString = 'INSERT INTO comments (videoID,comments,userID,createdAt) VALUES('+videoId[0].id+',"'+req.body.comment+'",'+ req.body.userId+','+connection.escape(today) +')';
                connection.query(queryString, function(err, newComments) {
                    if(!err && newComments != undefined) {
                        return res.send({
                            message: 'Comment inserted successfully.'
                        });
                    }else {
                        return res.send({
                            msg: 'Something went wrong.'
                        });
                    }
                });
            }
        });
    }
}

exports.getComments = function(req, res) {
    console.log('req', req.params.id);
    var allData = [];
    if(req.params.id) {
        connection.query('SELECT id FROM uploads WHERE v_id ="'+req.params.id+'"', function(err, videoId) {
            if(videoId != undefined) {
                connection.query('SELECT * FROM comments WHERE videoID ="'+videoId[0].id+'"', function(err, allComments) {
                    //console.log('allComments', allComments);
                     if(allComments != undefined) {

                        async.mapSeries(allComments, function(user, callback) {

                            connection.query('SELECT username FROM users WHERE id="'+user.userID+'"', function(err, userdata) {
                                var detail={};
                        detail.id = user.id;
                        detail.childID = user.childID;
                        detail.videoID = user.videoID;
                        detail.userID = user.userID;
                        detail.comments = user.comments;
                        detail.createdAt = user.createdAt;
                        detail.updatedAt = user.updatedAt;
                        detail.username = userdata[0].username;
                        allData.push(detail);
                            callback(null);
                            });
                        }, function(err, results) {
                            return res.send({
                                allComments: allData,
                               count: allData.length
                            });
                        });
                    }
                });
            }
        });
    }
}



