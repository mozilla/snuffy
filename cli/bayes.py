from collections import Counter
from functools import reduce
from operator import mul


def product(iterable):
    return reduce(mul, iterable, 1)


class Corpus:
    def __init__(self):
        self._counts = Counter()
        self.total = 0

    def add(self, text):
        for word in text.split():
            self._counts[word] = self._counts.get(word, 0) + 1
            self.total += 1

    def count(self, word):
        return self._counts.get(word, .01)  # arbitrary epsilon

    def __add__(self, other_corpus):
        ret = Corpus()
        ret._counts = self._counts.copy() + other_corpus._counts
        ret.total = sum(ret._counts.values())
        return ret


def belongs_in_corpus(text, corpus, uncorpus, both):
    """Return the probability that the given text should be considered a member of the corpus."""
    # TODO: Add logs instead of multiplying small floats.
    # TODO: Consider Laplace smoothing instead of epsilons.
    words = text.split()
    # Compute (∏ P(eachWord | memberOfCorpus)) * P(memberOfCorpus) / P(eachWord | anyCorpus)
    # ∏ P(eachWord | memberOfCorpus):
    prob = product(corpus.count(word) for word in words) / corpus.total
    # * P(memberOfCorpus):
    prob *= corpus.total / both.total
    # / P(eachWord | anyCorpus):
    prob /= product(both.count(word) for word in words) / both.total
    return prob


def main():
    corpus = Corpus()
    corpus.add('play')
    corpus.add('play')
#     corpus.add('i play a game')
#     corpus.add('i won the game')
#     corpus.add('will you play with me')

    uncorpus = Corpus()
    uncorpus.add('work')
    uncorpus.add('play')
#     uncorpus.add('i wish i were a rhino')
#     uncorpus.add('why do you toy with me')
#     uncorpus.add('wicked rhinos lie in wait for me')
    

    both = corpus + uncorpus

    print(belongs_in_corpus('play', corpus, uncorpus, both))
    print(belongs_in_corpus('play', uncorpus, corpus, both))
    print(belongs_in_corpus('work', corpus, uncorpus, both))
    print(belongs_in_corpus('work', uncorpus, corpus, both))


if __name__ == '__main__':
    main()
