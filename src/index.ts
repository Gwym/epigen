import { dbg } from "./services/logger";
import { BaseMongoPersistor } from "./base/mongodb";
import { configuration } from "./configuration";
import { BaseServerEngine } from "./base/engine";
import { BaseUnitTester } from "./tests/unittests";

dbg.log('index')


new BaseMongoPersistor().connect(configuration.mongoURL).then((persitor) => {
    dbg.info('Connected to MongoDB at: ' + configuration.mongoURL);

    new BaseServerEngine(configuration, persitor);

    try {
        let unit = new BaseUnitTester();
        unit.doTests();
    }
    catch (err) {
        console.error(err);
    }
});