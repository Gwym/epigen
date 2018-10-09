// configuration
// https://docs.mongodb.com/manual/tutorial/enable-authentication/

import * as Mongo from 'mongodb';
import * as bcrypt from 'bcrypt';

import { dbg } from '../services/logger'
import {
    CollectionId
} from './concept'

import {
    AsyncPersistor, UserDao, SaveByIdDao, SavePosDao
} from '../services/persistor'
import { MessageType, XLoginRequest, ErrMsg, XRegistrationRequest, UserSessionAck, UserOptions, BaseAdminInformations } from "../services/shared/messaging";
import { UserSession } from "../services/dispatcher";
import { InsertWriteOpResult } from "mongodb";

//export interface UpdateResult extends UpdateWriteOpResult { }
export interface InsertResult extends InsertWriteOpResult { }
// export interface BulkSaveResult extends BulkWriteResult { }

export class BaseMongoPersistor extends AsyncPersistor {

    private dbConnection: Mongo.Db
    private tracks: Mongo.Collection
    private sessions: Mongo.Collection
    private users: Mongo.Collection
   
    connect(mongoUrl: string): Promise<BaseMongoPersistor> {

        return new Promise<BaseMongoPersistor>((resolve, _reject) => {

            Mongo.MongoClient.connect(mongoUrl).then((mdb) => {

                //  TODO (1) : if (mongo version >= 3.2 useLookup { 
                // this.getPilotedRelList = this.getPilotedRelListLookup;
                /*
                var adminDb = db.admin();
                    adminDb.serverStatus(function(err, info) {
                        console.log(info.version);
                    })
                */


                this.dbConnection = mdb;
                this.tracks = mdb.collection('tracks');
                this.sessions = mdb.collection('sessions');
                this.users = mdb.collection('users');
               
                this.users.createIndex({ "name": 1 }, { unique: true })
                this.users.createIndex({ "mail": 1 }, { unique: true })

                // TODO (0) : session expiration
                /*var expir = new Date();
        expir.setDate(expir.getDate() + 5);
        this.generateCredential(expir); */

                resolve(this);

            }).catch(function (err) {
                dbg.error('Error connecting to Mongo. Message:\n' + err);
                // reject(err);
                throw (err); // Promises used in callbacks does not catch
            })
        })
    }

    close() {
        this.dbConnection.close();
    }

    getNow() {
        // TODO (0) : store/load timestamp at shutdown/failed
        return Date.now();
    }

    insertTrack(track: any) {
        this.tracks.insert(track);
    }

    getUserFromLogin(cmd: XLoginRequest): Promise<UserDao> {

        return new Promise<UserDao>((resolve, reject) => {

            this.users.find({ mail: cmd.login })
                .limit(1)
                .project({ _id: true, hash: true, name: true })
                .next(function (err, userDoc) {

                    dbg.log('getUserFromLogin > find err:' + err + ' user:' + userDoc);
                    dbg.log(JSON.stringify(userDoc));

                    if (err === null && userDoc && userDoc._id && userDoc.name) {

                        bcrypt.compare(cmd.password, userDoc.hash, function (err, res) {
                            if (res) {
                                let userDao: UserDao = {
                                    iId: userDoc._id.toHexString(),
                                    name: userDoc.name
                                }
                                resolve(userDao);
                            }
                            else {
                                console.error('getUserFromLogin > bcrypt failed err:' + err + ' res: ' + res + ' user:' + userDoc);
                                reject(ErrMsg.LoginError); // PasswordError
                            }
                        });
                    }
                    else {
                        console.error('getUserFromLogin > mongo failed err:' + err + ' user:' + userDoc);
                        reject(ErrMsg.LoginError); // Login error
                    }
                });
        });
    }



    /*   generateCredential(expiration: Date): Promise<string> {
   
           let invitationCode = Math.round(Math.random() * 10000).toString(); // TODO (5) : code generator
           console.log('generateCredential > invitationCode: ' + invitationCode + ' expiration: ' + expiration);
   
           return new Promise<string>((resolve, reject) => {
               this.users.insertOne({ invitationCode: invitationCode, expiration: expiration }, (err, result: Mongo.InsertOneWriteOpResult) => {
                   if (err === null && result && result.insertedId) {
                       console.log('generateCredential > OK ' + result.insertedId);
                       resolve(result.insertedId.toHexString());
                   }
                   else {
                       console.log('generateCredential > err ' + err);
                       console.error(err);
                       reject(err.toString());
                   }
               });
           });
       } */

    createUser(userReg: XRegistrationRequest): Promise<UserSessionAck> {

        // TODO (1) : if (credential.expiration <= Date.now() ) or  {credential.expiration: {$lt: Date.now()} }
        //  return this.users.findOneAndReplace({ invitationCode: userReg.code }, { mail: userReg.mail });

        // TODO (2) : checkPasswordStrenght()

        return new Promise<UserSessionAck>((resolve, reject) => {

            // TODO (1) : hash birthdate
            bcrypt.hash(userReg.password, 4, (err, hash) => { // TODO (1) : saltRound, err

                if (err) {
                    dbg.error(err);
                    reject(err);
                    return;
                }

                interface UserPrivateDocument extends UserOptions {
                    mail: string,
                    hash: string
                }
                let userDocument: UserPrivateDocument = {
                    name: userReg.name,
                    mail: userReg.mail,
                    hash: hash
                }

                // TODO (1) : check invitation code, reject(ErrMsg.InvalidCode);
                //  this.users.findOneAndReplace({ invitationCode: userReg.code }, { mail: userReg.mail }, (err, res) => {

                this.users.insertOne(userDocument, (err: Mongo.WriteError, res) => {
                    if (err === null && res.result.ok && res.insertedCount === 1) {
                        dbg.log('createUser > OK ' + userDocument);
                        let userAck: UserSessionAck = { type: MessageType.User, userOptions: { name: userDocument.name } };
                        resolve(userAck);
                    }
                    else {
                        dbg.log(err);

                        // https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
                        // example : { WriteError({"code":11000,"index":0,"errmsg":"E11000 duplicate key error collection: yenah.users index: name_1 dup key: { : \"test\" }","op":{"name":"test","mail":"test@test.fr","hash":"$2a$04$rgeUX7eSraGrtaW7S1Lp0O/0XR9Wya0K5.vuv.kFlIsJGoGcz0DMm","_id":"59589321bed74e09da709bcc"}})
                        if (err.code === 11000) {
                            
                            if (err.errmsg.indexOf('index: name') !== -1) {
                                reject(ErrMsg.DuplicateName);
                                return;
                            }
                            else if (err.errmsg.indexOf('index: mail') !== -1) {
                                reject(ErrMsg.DuplicateMail);
                                return;
                            }
                            
                        }

                        dbg.error(err); 

                        reject(ErrMsg.DatabaseError);
                    }
                })

            }); // bcrypt password

        });
    }

    // #IFDEF PERSISTOR_SESSIONS

    /* 
       // MONGO > v3.2 
        getUserFromSession(sessionId: string): Promise<any[]> {
     
                 return this.sessions.aggregate([
                     { $match: { _id: Mongo.ObjectID.createFromHexString(sessionId) } },
                     { $limit: 1 },
                 { $lookup: {
                         from: 'users',
                         localField: 'user_id',
                         foreignField: '_id',
                         as: 'userDoc'
                     } }
                 ]).toArray();
     
         } */
    /*
        getUserFromSession(sessionId: string): Promise<UserDao> {
    
            return new Promise<UserDao>((resolve, reject) => {
    
                let sid: Mongo.ObjectID = Mongo.ObjectID.createFromHexString(sessionId);
    
                this.sessions.find({ _id: sid })
                    .limit(1)
                    .project({ user_id: true })
                    .next((errSession, documentSession) => {
    
                        console.log(documentSession);
    
                        if (errSession === null && documentSession && documentSession.user_id) {
                            this.users.find({ _id: documentSession.user_id })
                                .limit(1)
                                .project({ _id: true, name: true })
                                .next((errUser, documentUser) => {
    
                                    // TODO (0) : refresh session expiration
    
                                    if (errUser === null && documentUser) {
                                        resolve(documentUser);
                                    } else {
                                        console.log('getUserFromSession > mongo failed errUser:' + errUser + ' docUser:' + documentUser + ' documentSession.user_id:' + documentSession.user_id);
                                        reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.UserNotFound });
                                    }
                                });
                        }
                        else {
                            console.log('getUserFromSession > mongo failed errSession:' + errSession + ' docSession:' + documentSession);
                            reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.SessionError });
                        }
                    });
            });
        }
    */
    /*
        generateSessionId(userAbsIId: UserItemIdentifier): Promise<string> {
    
            // TODO (0) : cookieExpiration
            return new Promise<string>((resolve, reject) => {
                this.sessions.insertOne({ user_id: Mongo.ObjectID.createFromHexString(userAbsIId.toString()) }, (err, result: Mongo.InsertOneWriteOpResult) => {
                    if (err != null) {
                        console.error('generateSessionId > err:' + err);
                        reject(<s2c_ChannelMessage>{ type: MessageType.Error, toStringId: ToStringId.DatabaseError }); // TODO (5) : MongoError -> ClientError
                    }
                    else {
    
                        //  let ack: SessionAck = { type: MessageType.SessionCheck, sessionId: result.insertedId.toHexString() };
                        console.log('generateSessionId > sessionId:' + result.insertedId);
    
                        resolve(result.insertedId.toHexString());
                    }
                });
            });
        }
    */
    // #ENDIFDEF PERSISTOR_SESSIONS

    // Note : docs.length should be > 0 (Mongo throws an exception if bulkOp.length === 0)
    protected saveById(coll: Mongo.Collection, daos: SaveByIdDao[]): Promise<Mongo.BulkWriteResult> {

        let bulk = coll.initializeUnorderedBulkOp();
        // TODO (1) : limit to 1000 or split
        // http://stackoverflow.com/questions/38048052/get-inserted-ids-for-bulk-insert-mongoskin

        for (let dao of daos) {
            if (dao.varAttr) {
                bulk.find({ _id: Mongo.ObjectID.createFromHexString(dao.iId.toString()) }).update({ $set: { varAttr: dao.varAttr } });

            }
            else if (dao.full) {
                bulk.find({ _id: Mongo.ObjectID.createFromHexString(dao.iId.toString()) }).upsert().update({ $set: dao.full });
            }
            else {
                throw 'Invalid saveById dao collection';
            }
        }

        return bulk.execute();
    }

    protected saveByPosition(coll: Mongo.Collection, docs: SavePosDao[]): Promise<Mongo.BulkWriteResult> {

        let bulk = coll.initializeUnorderedBulkOp();

        // TODO (1) : limit to 1000 or split
        // http://stackoverflow.com/questions/38048052/get-inserted-ids-for-bulk-insert-mongoskin

        for (let doc of docs) {
            bulk.find({ posX: doc.absPosX, posY: doc.absPosY }).upsert().update({ $set: doc.gist });
        }

        return bulk.execute();
    }


    adminDropCollections(collectionsToDrop: CollectionId[]) {

        // TODO (0) :  options { sessions: true, cells: true ... }
        // TODO (1) : disconnect users
        // this.users.drop(); 
        if (collectionsToDrop.indexOf(CollectionId.Session) !== -1) {
            this.sessions.drop(function (err, res) { dbg.log('db.dropCollections > drop sessions ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }
        if (collectionsToDrop.indexOf(CollectionId.User) !== -1) {
            this.users.drop(function (err, res) { dbg.log('db.dropCollections > drop users ' + (err ? err : '') + (res ? ' res:' + res : '')) });
        }


        /* 
        // FIXME (1) : non existing collection throws ns not found (breaking Promise sequence) => check if exists ?
        let promises = [];
 
         promises.push(this.sessions.drop());
         promises.push(this.cells.drop());
         promises.push(this.agents.drop());
         promises.push(this.furnitures.drop());
 
         console.log('db.drop > Droping ' + promises.length + ' collections(s)');
 
         return Promise.all(promises); */
    }


    adminGetInformation(user: UserSession): void {

        dbg.admin('AdminGetInformation ' + user.userOptions.name);

        let info: BaseAdminInformations = {
            type: MessageType.Admin,
            tracks: 0,
            sessions: 0,
            users: 0
        };

        let results: Promise<number>[] = [];

        /*  for (let collection in info) { 
              if (info.hasOwnProperty(collection)) {
                  results.push(this[collection].count({}));
              }
          } */

        results.push(this.tracks.count({}));
        results.push(this.sessions.count({}));
        results.push(this.users.count({}));
    
        Promise.all(results).then(values => {

            info.tracks = values[0];
            info.sessions = values[1];
            info.users = values[2];

            dbg.log('AdminGetInformation > ');

            user.send(info);
        }).catch(reason => {
            user.send(reason);
        });
    }

    adminCreateUserInvitation(user: UserSession) {

        dbg.admin('adminCreateUserInvitation ' + user.userOptions.name);

        user.send(ErrMsg.UnkownCommand);
        /*


        new Promise<number>((resolve, reject) => {

        }).then(
            
            user.send({}});
        }).catch(reason => {
            user.send({}});
        }); */
    }

}
