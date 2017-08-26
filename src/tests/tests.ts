import { dbg } from '../services/logger'
import { BaseServerEngine } from "../base/engine";
import { AsyncPersistor } from "../services/persistor";
import { InsertResult } from "../base/mongodb"; // FIXME : db dependent

// TODO (1) : separate server tests, client tests, shared tests, mind

export interface SimulationResult {}

export class BaseIntegrationTester {

    constructor(protected engine: BaseServerEngine) {

        dbg.log('BaseIntegrationTester.constructor > ');

    }

    populate(_db: AsyncPersistor): Promise<InsertResult[]> {

        //return db.populate(insertZoneDao);

        return new Promise<InsertResult[]>(() => {      
        });
    }

    simulate(_db: AsyncPersistor): Promise<SimulationResult[]> {
        return new Promise<SimulationResult[]>(() => {      
        });
    }

    
}
