const {assert, expect} = require('chai');
const firefox = require('selenium-webdriver/firefox');
const {Builder, until, By, Capabilities} = require('selenium-webdriver');
const {ancestors, isDomElement, isVisible, toDomElement, windowForElement} = require('../../utilsForFrontend'); // eslint-disable-line node/no-missing-require
const  request = require('request');

const WAIT_MS = 10000;  //increasing from 10000 to 20000 did not allow first test to run.
const TEST_PAGE_URL = 'http://localhost:8000/isVisible.html';

describe('isVisible', () => {
    const options = new firefox.Options();
    options.headless();

    const caps = new Capabilities('eager');
    const driver = new Builder()
        .withCapabilities(caps)
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build();

    //Need to kick the page before doing any tests.
    driver.get(TEST_PAGE_URL);

    async function checkElementVisibility(id, expected) {
        console.log('11111111');
        await driver.wait(until.elementLocated(By.id(id)), WAIT_MS);
        console.log('22222222');
        const isElementVisible = await driver.executeScript(`
            ${ancestors}
            ${isDomElement}
            ${toDomElement}
            ${windowForElement}
            return ${isVisible}(document.getElementById('${id}'));
        `);
        console.log(`id: ${id} expected: ${expected} result: ${isElementVisible}`);
        assert.equal(
            isElementVisible,
            expected,
            `isVisible should return ${expected} for element with id '${id}'.`
        );
        console.log('33333333');
    }

    async function checkElementsVisibility(idStub, isVisible) {
        console.log('1111');
        try {

            const elementIds = await driver.executeScript(`
                return Array.prototype.map.call(document.querySelectorAll('[id^="${idStub}"]'), (element) => element.id);
            `);

            console.log('2222');
            await driver.get(TEST_PAGE_URL);
            console.log('3333');
            for (const id of elementIds) {
                await checkElementVisibility(id, isVisible);
            }
        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }
        console.log('4444');
    }

    /*it('should return false when an element is hidden', async function () {
        console.log('>>> Started IS HIDDEN');
        this.timeout(WAIT_MS);
        await checkElementsVisibility('not-visible-', false);
        console.log('<<< Finished IS HIDDEN');
    });

    it('should return true when an element is visible', async function () {
        console.log('>>> Started IS VISIBLE');
        this.timeout(WAIT_MS);
        await checkElementsVisibility('visible-', true);
        console.log('<<< Finished IS VISIBLE');
    });*/

    it('should run simple_selenium_test', async function test() {
        try {
            await console.log('1111');
            await driver.get(TEST_PAGE_URL);
            await console.log('2222');
            let element = await driver.findElement(By.id('not-visible-1'));
            await console.log(element);
            await console.log('3333');
        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }
    });

    it('should return 200', function (done) {
        request.get(TEST_PAGE_URL, function (err, res, body) {
            console.log(`Processed simple test`);
            expect(res.statusCode).to.equal(200);
            expect(res.body).to.contain('not-visible-1');
            done();
        });

        /*try {
            console.log('aaaa');
            console.log(element);
            console.log('bbbb');
            const start = new Date().getTime();
            driver.executeAsyncScript(
                'window.setTimeout(arguments[arguments.length - 1], 500);').
                then(function () {
                    console.log('Elapsed time: ' + (new Date().getTime() - start) + ' ms');
                });
            console.log('cccc');

        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }*/

    });

    after(async function () {
        this.timeout(WAIT_MS);
        console.log('Calling driver.quit()');
        return await driver.quit();
    });
});
