

import { UserAsyncManager, UserSession } from "./dispatcher";
import { XLoginRequest, XRegistrationRequest, UserSessionAck } from "./shared/messaging";

// TODO (2) : /shared/user.ts
export type ItemIdentifier = string
export type UserItemIdentifier = string

type CollectionId = number // ~ declare enum CollectionId {}

export interface UserDao {
    iId: UserItemIdentifier
    name: string
}
// end /shared/user.ts


export interface SaveByIdDao { // ~ abstract interface, full and varAttr are mutualy exclusive
    iId: ItemIdentifier
    full?: any
    varAttr?: any
}

export interface SaveByIdFullDao extends SaveByIdDao {
    full: any
    varAttr: undefined
}

export interface SaveByIdVarDao extends SaveByIdDao {
    full: undefined
    varAttr: any
}

export interface SavePosDao {
    absPosX: number,
    absPosY: number,
    gist: any 
}

export abstract class AsyncPersistor implements UserAsyncManager {
    
        static MAX_FILTER_LIMIT = 100 // FIXME (5) : MongoDb dependent  
        static DEFAULT_FILTER_LIMIT = 10 // TODO (5) check if DEFAULT_FILTER_LIMIT <= MAX_FILTER_LIMIT
    
        abstract insertTrack(track: any): void
    
        abstract getUserFromLogin(cmd: XLoginRequest): Promise<UserDao>
        abstract createUser(userReg: XRegistrationRequest): Promise<UserSessionAck>
    // #IFDEF PERSISTOR_SESSIONS
    //    abstract generateSessionId(userAbsIId: UserItemIdentifier): Promise<string>
    //    abstract getUserFromSession(sessionId: string): Promise<UserDao> 
    // #ENDIFDEF PERSISTOR_SESSIONS
    
        abstract getNow(): number
    
        abstract adminDropCollections(collectionsToDrop: CollectionId[]): void
        abstract adminGetInformation(user: UserSession): void
        abstract adminCreateUserInvitation(user: UserSession): void
    }
    