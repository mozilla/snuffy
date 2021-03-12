const {assert} = require('chai');
const firefox = require('selenium-webdriver/firefox');
const {Builder, until, By} = require('selenium-webdriver');
const {ancestors, isDomElement, isVisible, toDomElement, windowForElement} = require('../../utilsForFrontend'); // eslint-disable-line node/no-missing-require

const WAIT_MS = 10000;  //increasing from 10000 to 20000 did not allow first test to run.
const TEST_PAGE_URL = 'http://localhost:8000/isVisible.html';

describe('isVisible', () => {
    const options = new firefox.Options();
    options.headless();

    const driver = new Builder()
        .forBrowser('firefox')
        .setFirefoxOptions(options)
        .build();

    //Need to kick the page before doing any tests.
    driver.get(TEST_PAGE_URL);

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
        const elementIds = await driver.executeScript(`
            return Array.prototype.map.call(document.querySelectorAll('[id^="${idStub}"]'), (element) => element.id);
        `);

        await driver.get(TEST_PAGE_URL);
        for (const id of elementIds) {
            await checkElementVisibility(id, isVisible);
        }
    }

    it('should return false when an element is hidden', async function () {
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
    });

    after(async function () {
        this.timeout(WAIT_MS);
        return driver.quit();
    });
});
