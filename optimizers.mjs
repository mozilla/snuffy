import {readFileSync} from 'fs';
import {basename, join} from 'path';

import {dirsIn, staticDom} from './utilsForBackend';
import {setDefault} from './utilsForFrontend';


// This is based on public-domain code from
// https://github.com/rcorbish/node-algos.
/**
 * Abstract base for simulated annealing runs
 *
 * This works for fitness functions which are staircase functions, made of
 * vertical falloffs and flat horizontal regions, where continuous numerical
 * optimization methods get stuck. It starts off looking far afield for global
 * minima and gradually shifts its focus to the best local one as time
 * progresses.
 *
 * More technically, we look around at random for changes that reduce the value
 * of the cost function. Occasionally, a random change that increases cost is
 * incorporated. The chance of incorporating a cost-increasing change lessens
 * as the algorithim progresses.
 */
export class Annealer {
    constructor(initialTemperature = 5000, coolingSteps = 5000, coolingFraction = .95, stepsPerTemp = 1000) {
        this.INITIAL_TEMPERATURE = initialTemperature;
        this.COOLING_STEPS = coolingSteps;
        this.COOLING_FRACTION = coolingFraction;
        this.STEPS_PER_TEMP = stepsPerTemp;
        this.BOLTZMANNS = 1.3806485279e-23;
    }

    /**
     * Iterate over a variety of random solutions for a finite time, and return
     * the best we come up with.
     *
     * @return {number[]} Coefficients we arrived at
     */
    anneal() {
        let temperature = this.INITIAL_TEMPERATURE;
        let currentSolution = this.initialSolution();
        let bestSolution = currentSolution;
        let currentCost = this.solutionCost(currentSolution);
        let bestCost = currentCost;
        let m = 0;
        let n = 0;
        let hits = 0, misses = 0;
        const seenSolutions = new Map();  // solution => cost
        for (let i = 0; i < this.COOLING_STEPS; i++) {
            console.log('Cooling step', i, 'of', this.COOLING_STEPS, '...');
            const startCost = currentCost;
            for (let j = 0; j < this.STEPS_PER_TEMP; j++) {
                let newSolution = this.randomTransition(currentSolution);
                if (seenSolutions.has(newSolution.toString())) {
                    hits += 1;
                } else {
                    misses += 1;
                }
                let newCost = setDefault(seenSolutions, newSolution.toString(), () => this.solutionCost(newSolution));

                if (newCost < currentCost) {
                    // Always take improvements.
                    currentCost = newCost;
                    currentSolution = newSolution;
                    if (newCost < bestCost) {
                        bestCost = newCost;
                        bestSolution = newSolution;
                        console.log('New best solution is ', newSolution, ' with cost ', newCost);
                    }
                } else {
                    // Sometimes take non-improvements.
                    const minusDelta = currentCost - newCost;
                    const merit = Math.exp(minusDelta / (this.BOLTZMANNS * temperature));
                    if (merit > Math.random()) {
                        m++;
                        currentCost = newCost;
                        currentSolution = newSolution;
                    }
                }
                n++;
                // Exit if we're not moving:
                if (startCost === currentCost) { break; }
            }
            temperature *= this.COOLING_FRACTION;
        }
        console.log('Iterations:', n, 'using', m, 'jumps.');
        console.log('Cache hits', hits, 'misses', misses);
        console.log('Cache hit rate', hits/(hits + misses));
        return bestSolution;
    }

    /**
     * @return {number[]} Coefficients to begin the random walk from. The
     *     quality of this solution is not very important.
     */
    initialSolution() {
        throw new Error('initialSolution() must be overridden.');
    }

    /**
     * @return {number[]} Coefficients randomly changed slightly from the
     *     passed-in ones
     */
    randomTransition(coeffs) {
        throw new Error('randomTransition() must be overridden.');
    }

    /**
     * @return {number} A cost estimate for the passed-in solution, on an
     *     arbitrary scale. Lower signifies a better solution.
     */
    solutionCost(coeffs) {
        throw new Error('solutionCost() must be overridden.');
    }
}

/**
 * A run of a parametrized ruleset over an entire supervised corpus of pages
 *
 * Builds up a total score and reports it at the end.
 */
export class Run {
    /**
     * Run ruleset against every document in the corpus, and make the final
     * score ready for retrieval by calling :func:`score` or :func:`humanScore`.
     *
     * @arg corpus {Corpus} The documents over which to run the ruleset
     * @arg coeffs {Number[]|undefined} The coefficients by which to
     *     parametrize the ruleset
     */
    constructor(corpus, coeffs) {
        /**
         * During the run, the current :class:`Sample`. Use this in
         * :func:`rulesetMaker` to fetch any necessary sample-specific
         * metadata, like the values of computed CSS properties.
         */
        this.currentSample = undefined;

        const rulesetMaker = this.rulesetMaker();
        const parametrizedRuleset = coeffs === undefined ? rulesetMaker() : rulesetMaker(...coeffs);

        /**
         * An arbitrarily structured object for keeping track of the score so far
         */
        this.scoreParts = this.initialScoreParts();

        this.corpus = corpus;
        for (this.currentSample of corpus.samples.values()) {
            this.updateScoreParts(this.currentSample, parametrizedRuleset, this.scoreParts);
        }
    }

    /**
     * Return a callable that, given coefficients as arguments, returns a
     * parametrized :class:`Ruleset`.
     */
    rulesetMaker() {
        throw new Error('rulesetMaker() must be overridden.');
    }

    /**
     * Return the state of :attr:`scoreParts` to start with. It will then be
     * updated with each iteration, by :func:`updateScoreParts`.
     */
    initialScoreParts() {
        throw new Error('initialScoreParts() must be overridden.');
    }

    /**
     * Run the ruleset over the single sample, and update :attr:`scoreParts`.
     *
     * @arg sample An arbitrary data structure that specifies which sample
     *     from the corpus to run against and the expected answer
     * @return nothing
     */
    updateScoreParts(sample, ruleset, scoreParts) {
        throw new Error('updateScoreParts() must be overridden.');
    }

    /**
     * Return the score for the optimizer to minimize. This should read from
     * :attr:`scoreParts` and return something as efficiently as possible,
     * because the optimizer runs a lot of iterations.
     */
    score() {
        throw new Error('score() must be overridden.');
    }

    /**
     * Return a human-readable score, for cosmetic reporting. Like
     * :func:`score`, it should read from :attr:`scoreParts`.
     */
    humanScore() {
        throw new Error('humanScore() must be overridden.');
    }
}

/**
 * A reusable, caching representation of a group of samples
 *
 * This solves the problem of jsdom leaking on repeated instantiation and of
 * the performance penalty inherent in re-parsing sample data.
 */
export class Corpus {
    /**
     * On construct, this loops across the folders inside :func:`baseFolder`,
     * caching each as a :class:`Sample`.
     */
    constructor() {
        const baseFolder = this.baseFolder();

        /** An iterable of :class:`Sample` instances making up the corpus */
        this.samples = new Map();  // folder name -> sample

        for (const sampleDir of dirsIn(baseFolder)) {
            this.samples.set(sampleDir, this.sampleFromPath(join(baseFolder, sampleDir)));
        }
    }

    /**
     * @return {String} The path to the folder in which samples live.
     */
    baseFolder() {
        throw new Error('baseFolder() must be overridden.');
    }

    /**
     * @return {Sample} A new :class:`Sample` subclass representing the sample
     *     embodied by the folder ``sampleDirPath``
     */
    sampleFromPath(sampleDirPath) {
        throw new Error('sampleFromPath() must be overridden.');
    }
}

/**
 * One item in a corpus of training or testing data
 *
 * This assumes a folder surrounds the sample and contains a ``source.html``
 * file containing markup we want to make use of. This lands in :attr:`doc`.
 * :attr:`name` contains the name of the folder. Override the constructor to
 * pull in additional information you're interested in.
 */
export class Sample {
    /**
     * @arg sampleDir {String} Path to the folder representing the sample,
     *     containing ``source.html`` and other files at your discretion
     */
    constructor(sampleDir) {
        const html = readFileSync(join(sampleDir, 'source.html'),
                                  {encoding: 'utf8'});
        /**
         * The DOM of the HTML document I represent
         */
        this.doc = staticDom(html);
        /**
         * The name of the folder this sample came from
         */
        this.name = basename(sampleDir);
    }
}
