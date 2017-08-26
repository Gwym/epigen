import { dbg } from "../services/logger";

// TODO (1) : remove assert from Logger and add it To TestLogger ?
// add this.assert() ... => client report

export class BaseUnitTester {

    log(s: string) {
        dbg.log(s)
    }

    doTests() {
        this.testUser()
    }

    testUser() {

        dbg.log('test User creation')

        UserTester.testCore()
    }
}

class UserTester {

    static testCore() {

    }
}