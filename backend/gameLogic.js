/**
 * Validates a 4-digit guess against a secret number.
 * Returns correct positions and wrong position digits.
 */
function evaluateGuess(secret, guess) {
  const correctPosition = [];
  const wrongPositionDigits = [];

  const secretArr = secret.split('');
  const guessArr = guess.split('');

  // Keep track of which indices are matched
  const secretMatched = Array(4).fill(false);
  const guessMatched = Array(4).fill(false);

  // First pass: Correct positions
  for (let i = 0; i < 4; i++) {
    if (guessArr[i] === secretArr[i]) {
      correctPosition.push({
        digit: parseInt(guessArr[i]),
        position: i + 1 // 1-indexed for client readability
      });
      secretMatched[i] = true;
      guessMatched[i] = true;
    }
  }

  // Second pass: Wrong positions
  for (let i = 0; i < 4; i++) {
    if (guessMatched[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (!secretMatched[j] && guessArr[i] === secretArr[j]) {
        wrongPositionDigits.push(parseInt(guessArr[i]));
        secretMatched[j] = true;
        break;
      }
    }
  }

  return {
    correctPosition,
    wrongPositionDigits
  };
}

module.exports = {
  evaluateGuess
};
