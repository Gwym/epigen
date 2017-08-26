
import { dbg } from "../services/logger";
import { BaseServerEngine } from "./engine";
import { AdminRequest, ErrMsg, AdminActId } from "../services/shared/messaging";
import { CollectionId } from "./concept";
import { BaseUnitTester } from "../tests/unittests";
import { BaseIntegrationTester } from "../tests/tests";
import { UserSession } from "../services/dispatcher";
import { BaseMongoPersistor } from "./mongodb";

// TODO (2) : Mongo -> Generic persistor

export class AdminDispatcher {

    mongoTestURL = "mongodb://localhost:27017/yenahtest"; // TODO (4) : in configuration ?

    constructor(private engine: BaseServerEngine) {

    }

    dispatchWsAdminCommand(cmd: AdminRequest, user: UserSession) {

        if (cmd.adminActId === AdminActId.Information) {

            dbg.admin('Information');
            this.engine.getDb().adminGetInformation(user);
        }
        else if (cmd.adminActId === AdminActId.CreateUser) {

            dbg.admin('CreateUser');
            this.engine.getDb().adminCreateUserInvitation(user);
        }
        else if (cmd.adminActId === AdminActId.DeleteUsers) {

            dbg.admin('DeleteUsers');
            this.engine.getDb().adminDropCollections([CollectionId.User, CollectionId.Session]);
        }
        else if (cmd.adminActId === AdminActId.ResetWorld) {

            dbg.admin('ResetWorld');
            this.reset();
        }
        else if (cmd.adminActId === AdminActId.UnitTests) {
            dbg.admin('UnitTests');
            this.doUnitTests();
        }
        else if (cmd.adminActId === AdminActId.IntegrationTests) {
            dbg.admin('IntegrationTests');
            this.doIntegrationTests();
        }
        else {
            dbg.error('dispatchWsAdminCommand > Unknown type ' + cmd.type);
            user.send(ErrMsg.UnkownCommand);
        }
    }

    reset() {


        dbg.admin('Reset system ');

        let db = this.engine.getDb();

        db.adminDropCollections([
            CollectionId.Session
        ]);

        let simulator = new BaseIntegrationTester(this.engine);

        simulator.populate(db);
    };


    doUnitTests() {

        let unit = new BaseUnitTester();
        unit.doTests();

    }

    doIntegrationTests() {

        // TODO (1) : stop all other admin command possibilities during tests 
        let currentDB = this.engine.getDb();
        let simulator: BaseIntegrationTester;
        let db = new BaseMongoPersistor();

        db.connect(this.mongoTestURL)
            .then(() => {
                dbg.info('Connected to Test MongoDB at: ' + this.mongoTestURL);

                this.engine.setDb(db);
                simulator = new BaseIntegrationTester(this.engine);

                db.adminDropCollections([
                    CollectionId.Session
                ]);
                return simulator.populate(db)
            })
            .then((insertResults) => {

                let count = 0;

                for (let insertResult of insertResults) {
                    if (insertResult.result.ok !== 1) {
                        throw 'db.simu > insert failed ' + insertResult;
                    }
                    else {
                        count += insertResult.insertedCount;
                    }
                }

                dbg.log('db.simu > Inserted ' + count);

                
                return simulator.simulate(db);
            })
            .then((simulationResult) => {

                // TODO (1) : simulationResultMessage, user.send(JSON.stringify(simulationResultMessage));
                dbg.log(JSON.stringify(simulationResult));

                // ~ Promise.finally 
                // TODO (5) : db.dropDatabase();
                db.close();
                dbg.info('test done setting original db');
                this.engine.setDb(currentDB);
            })
            .catch((e) => {
                dbg.error('db.simu.catch > ' + e);
                // ~ Promise.finally 
                // TODO (5) : db.dropDatabase();
                db.close();
                dbg.info('test done setting original db');
                this.engine.setDb(currentDB);
            });
    }
}


