const {assert, expect} = require('chai');
const firefox = require('selenium-webdriver/firefox');
const {Builder, until, By, Capabilities} = require('selenium-webdriver');
const {ancestors, isDomElement, isVisible, toDomElement, windowForElement} = require('../../utilsForFrontend'); // eslint-disable-line node/no-missing-require
const  request = require('request');

const WAIT_MS = 20000;  //increasing from 10000 to 20000 did not allow first test to run.
const TEST_PAGE_URL = 'http://localhost:8000/isVisible.html';

describe('isVisible', () => {
    const options = new firefox.Options();
    options.headless();

    const driver = new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .disableEnvironmentOverrides()
        .setLoggingPrefs({Browser: 'All', Driver: 'All'})
        .build();

    let caps_promise = driver.getCapabilities();
    caps_promise.then(function (caps) {
        let browserName = caps.getBrowserName();
        let browserVersion = caps.getBrowserVersion();
        console.log(`PREP: Selenium is using ${browserName} : ${browserVersion}`);
        let proxy = caps.getProxy();
        let certs = caps.getAcceptInsecureCerts();
        let platform = caps.getPlatform();
        console.log(`PREP: proxy settings: ${proxy} acceptInsecureCerts: ${certs} platform: ${platform}`);
    });


    async function checkElementVisibility(id, expected) {
        await driver.wait(until.elementLocated(By.id(id)), WAIT_MS);
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
    }

    async function checkElementsVisibility(idStub, isVisible) {
        try {
            const elementIds = await driver.executeScript(`
                return Array.prototype.map.call(document.querySelectorAll('[id^="${idStub}"]'), (element) => element.id);
            `);
            await driver.get(TEST_PAGE_URL);
            for (const id of elementIds) {
                await checkElementVisibility(id, isVisible);
            }
        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }
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


    /*before(function () {
        console.log(`Calling before`);
        driver.get( TEST_PAGE_URL );
        //without await the url is about:blank but cannot add await outside async
        let current_url_promise = driver.getCurrentUrl();
        current_url_promise.then(function (url) {
            console.log(`current_url ${url}`);
        });
        let el_promise = driver.findElement(By.id('not-visible-1'));
        el_promise.then(function (ele) {
            console.log(`not-visible-1 element ${ele}`);
        });
        console.log(`Finished calling before test`);
    });*/

    async function basic() {
        await driver.get( TEST_PAGE_URL );
        let current_url = await driver.getCurrentUrl();
        console.log(`BASIC: current_url ${current_url}`);

        let ele = await driver.findElement(By.id('not-visible-1'));
        console.log(`BASIC: not-visible-1 element ${ele}`);
    }

    it('should run simple_selenium_test', async function () {

        await basic();
        /*try {
            console.log('1111');
            var titlePromise = driver.getTitle();
            titlePromise.then(function (title) {
                console.log(`Retrieved title: ${title}`);
                assert(title === 'isVisible functional test');
            });
            console.log('2222');
            //let element = driver.findElement(By.id('not-visible-1'));
            //console.log(element);
            console.log('3333');
            done();
        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }*/
    });

    /*it('should return 200', function test() {
        try {
            request.get(TEST_PAGE_URL, function (err, res, body) {
                console.log(`Processing simple test`);
                expect(res.statusCode).to.equal(200);
                expect(res.body).to.contain('not-visible-1');
                console.log(`Processed simple test`);
            });
        } catch (err) {
            console.log(`Received error:  ${err.name} ---- ${err.message} ---- ${err.stack}`);
            console.trace();
            throw err;
        }
    });*/
    after(function () {
        this.timeout(WAIT_MS);
        console.log('Calling driver.quit()');
        return driver.quit();
    });


});
