// base* are demos for extension or inspiration

import { dbg } from '../services/logger'
import { UserOptions, MessageType, c2s_ChannelMessage, ErrMsg, QueryFilter, AdminRequest } from '../services/shared/messaging'
import { Dispatcher, UserSession } from '../services/dispatcher';
import { AsyncPersistor } from '../services/persistor';
import { AdminDispatcher } from './admin';

export class BaseServerEngine extends Dispatcher {

    // protected db: AsyncPersistor
    // TODO (1) : admin only on conditional compiling ? option ?
    protected adminDispatcher: AdminDispatcher = new AdminDispatcher(this);

    createSession(userOptions: UserOptions): UserSession {

        let wsu: UserSession | undefined;

        do {
            wsu = new UserSession(userOptions);
            dbg.log('create session : ' + wsu.sessionId);

            if (this.userSessions[wsu.sessionId]) {
                wsu = undefined;
            }
        }
        while (wsu === undefined)

        this.userSessions[wsu.sessionId] = wsu;

        return wsu;
    }

    dispatchWsCommand(cmd: c2s_ChannelMessage, user: UserSession): void {

       /* if (cmd.type === MessageType. ...) {

            ...
        } else */
        if (cmd.type === MessageType.Admin) {
            // TODO (0) : if (user.isAdministrator) ... // access management : user or global ? 
            this.adminDispatcher.dispatchWsAdminCommand(<AdminRequest>cmd, user);
        }
        else {
            console.error('dispatchWsCommand > Unknown type ' + cmd.type);
            user.send(ErrMsg.UnkownCommand);
        }
    }
}

// TODO (1) : put check monitor in shared file messaging for client side filter pre-checks ?

class EngineMonitor {

    toRangedInteger(value: any) {

        if (typeof value === "number" &&
            isFinite(value) &&
            Math.floor(value) === value &&
            value > 0 &&
            value <= AsyncPersistor.MAX_FILTER_LIMIT) {
            return value;
        }
        else {
            //  TODO (1) : monitor.log( input failed );
            return AsyncPersistor.DEFAULT_FILTER_LIMIT;
        }
    }

    checkFilter(inFilter: any): QueryFilter {

        let filter: QueryFilter = {
            limit: this.toRangedInteger(inFilter.limit)
        }
        return filter;
    }
}


export var monitor = new EngineMonitor();

