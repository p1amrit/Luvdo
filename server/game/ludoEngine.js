export const COLORS = ['mint', 'rose', 'lavender', 'peach'];

export const COLOR_CONFIG = {
  rose: {
    id: 'rose',
    name: 'Rose',
    emoji: '💖',
    hex: '#f43f5e',
    secondary: '#fb7185',
    startIndex: 0,
    team: 0
  },
  lavender: {
    id: 'lavender',
    name: 'Purple',
    emoji: '💜',
    hex: '#a855f7',
    secondary: '#c084fc',
    startIndex: 13,
    team: 1
  },
  peach: {
    id: 'peach',
    name: 'Peach',
    emoji: '🍑',
    hex: '#fb923c',
    secondary: '#fdba74',
    startIndex: 26,
    team: 0 // In 2v2: rose + peach vs lavender + mint
  },
  mint: {
    id: 'mint',
    name: 'Mint',
    emoji: '🌿',
    hex: '#2dd4bf',
    secondary: '#5eead4',
    startIndex: 39,
    team: 1
  }
};

export const TOTAL_MAIN_TILES = 52;
export const HOME_RUNWAY_LENGTH = 5;
export const GOAL_PROGRESS = 56; // 0..50 (main) + 51..55 (runway) + 56 (home)

export const SAFE_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export function createInitialGameState(playerConfigs = [], options = {}) {
  // playerConfigs: [{ id, name, avatar, color }]
  const { mode = 'friends-party', vibe = 'friends', gentleMode = false, quickMode = false } = options;

  const players = playerConfigs.map((p, idx) => ({
    id: p.id,
    name: p.name || `Player ${idx + 1}`,
    avatar: p.avatar || '😎',
    color: p.color || COLORS[idx],
    team: mode === 'power-couple-2v2' ? (p.team !== undefined ? p.team : (idx % 2)) : idx,
    tokens: [
      { id: 0, progress: -1, stepHistory: [] },
      { id: 1, progress: -1, stepHistory: [] },
      { id: 2, progress: -1, stepHistory: [] },
      { id: 3, progress: -1, stepHistory: [] }
    ],
    tokensHome: 0,
    hasWon: false,
    isBot: !!p.isBot
  }));

  return {
    mode,
    vibe,
    gentleMode,
    quickMode,
    targetTokensToWin: quickMode ? 2 : 4, // 4 by default (or 2 if quickMode is toggled on)
    players,
    currentTurnIndex: 0,
    diceValue: null,
    rollId: null,
    isRolling: false,
    consecutiveSixes: 0,
    movableTokenIds: [],
    winner: null,
    lastEvent: {
      type: 'game_start',
      text: 'Game started! Roll the dice to begin.'
    },
    activeDare: null,
    roundCount: 1
  };
}

// Convert player progress to actual board coordinate
export function getBoardPosition(color, progress) {
  if (progress === -1) {
    return { type: 'base', color };
  }
  if (progress === GOAL_PROGRESS) {
    return { type: 'home', color };
  }
  if (progress >= 51 && progress <= 55) {
    return { type: 'runway', color, step: progress - 51 };
  }
  const startIndex = COLOR_CONFIG[color].startIndex;
  const tileIndex = (startIndex + progress) % TOTAL_MAIN_TILES;
  return {
    type: 'main',
    index: tileIndex,
    isSafe: SAFE_INDICES.includes(tileIndex)
  };
}

export function getMovableTokens(player, diceValue) {
  if (diceValue === null || player.hasWon) return [];
  const movable = [];

  player.tokens.forEach(token => {
    // Already in home
    if (token.progress === GOAL_PROGRESS) return;

    // In yard / base
    if (token.progress === -1) {
      if (diceValue === 6) {
        movable.push(token.id);
      }
      return;
    }

    // On track or runway
    if (token.progress + diceValue <= GOAL_PROGRESS) {
      movable.push(token.id);
    }
  });

  return movable;
}

export function rollDiceForCurrentPlayer(gameState) {
  if (gameState.winner) return null;
  const dice = Math.floor(Math.random() * 6) + 1;
  const currentPlayer = gameState.players[gameState.currentTurnIndex];

  let consecutiveSixes = gameState.consecutiveSixes;
  if (dice === 6) {
    consecutiveSixes += 1;
  } else {
    consecutiveSixes = 0;
  }

  // 3 sixes penalty
  if (consecutiveSixes === 3) {
    gameState.consecutiveSixes = 0;
    gameState.diceValue = dice;
    gameState.rollId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    gameState.movableTokenIds = [];
    gameState.lastEvent = {
      type: 'penalty',
      text: `${currentPlayer.name} rolled three 6s in a row! Turn skipped.`,
      color: currentPlayer.color
    };
    return { dice, movableTokenIds: [], penalty: true, rollId: gameState.rollId };
  }

  gameState.diceValue = dice;
  gameState.rollId = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  gameState.consecutiveSixes = consecutiveSixes;

  const movableTokenIds = getMovableTokens(currentPlayer, dice);
  gameState.movableTokenIds = movableTokenIds;

  gameState.lastEvent = {
    type: 'dice_roll',
    text: `${currentPlayer.name} rolled a ${dice}!`,
    color: currentPlayer.color,
    dice
  };

  return { dice, movableTokenIds, penalty: false, rollId: gameState.rollId };
}

export function moveToken(gameState, tokenId) {
  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  if (!currentPlayer || gameState.winner) return false;

  const token = currentPlayer.tokens.find(t => t.id === tokenId);
  if (!token) return false;

  const dice = gameState.diceValue;
  if (!dice) return false;

  let extraTurn = false;
  let dareCard = null;
  let capturedToken = null;

  // Case 1: Token in Base
  if (token.progress === -1) {
    if (dice !== 6) return false;
    token.progress = 0;
    token.stepHistory.push(0);
    extraTurn = true; // Rolling a 6 earns extra turn
    gameState.lastEvent = {
      type: 'token_spawn',
      text: `${currentPlayer.name} unlocked a heart token onto the board!`,
      color: currentPlayer.color
    };
  } else {
    // Case 2: Moving forward
    const newProgress = token.progress + dice;
    if (newProgress > GOAL_PROGRESS) return false;

    token.progress = newProgress;
    token.stepHistory.push(newProgress);

    // Reached Home Sanctuary
    if (newProgress === GOAL_PROGRESS) {
      currentPlayer.tokensHome += 1;
      extraTurn = true; // Reaching home gives bonus roll
      gameState.lastEvent = {
        type: 'token_home',
        text: `💖 ${currentPlayer.name} brought a token safely to the Love Sanctuary!`,
        color: currentPlayer.color
      };

      // Check win condition
      if (currentPlayer.tokensHome >= gameState.targetTokensToWin) {
        currentPlayer.hasWon = true;
        gameState.winner = {
          player: currentPlayer,
          mode: gameState.mode
        };
        gameState.lastEvent = {
          type: 'victory',
          text: `🎉 ${currentPlayer.name} has won the match! All 4 tokens home! 🏆`,
          color: currentPlayer.color
        };
        return true;
      }
    } else if (newProgress <= 50) {
      // Main track collision and captures
      const boardPos = getBoardPosition(currentPlayer.color, newProgress);

      // Check Captures (only if not on a safe tile)
      if (!boardPos.isSafe) {
        for (const otherPlayer of gameState.players) {
          if (otherPlayer.id === currentPlayer.id) continue;

          // Check if teammate in 2v2
          const isTeammate = gameState.mode === 'power-couple-2v2' && otherPlayer.team === currentPlayer.team;

          for (const otherToken of otherPlayer.tokens) {
            if (otherToken.progress >= 0 && otherToken.progress <= 50) {
              const otherPos = getBoardPosition(otherPlayer.color, otherToken.progress);
              if (otherPos.type === 'main' && otherPos.index === boardPos.index) {
                if (isTeammate) {
                  // Couple Bond / Shield!
                  gameState.lastEvent = {
                    type: 'couple_bond',
                    text: `💞 Couple Shield formed! ${currentPlayer.name} and ${otherPlayer.name} are safe together.`,
                    color: currentPlayer.color
                  };
                } else {
                  // Capture opponent!
                  otherToken.progress = -1;
                  capturedToken = {
                    player: otherPlayer,
                    token: otherToken
                  };
                  extraTurn = true; // Capturing earns bonus roll

                  if (gameState.gentleMode) {
                    gameState.lastEvent = {
                      type: 'gentle_capture',
                      text: `🤗 ${currentPlayer.name} gave ${otherPlayer.name}'s token a warm hug back to base!`,
                      color: currentPlayer.color
                    };
                  } else {
                    gameState.lastEvent = {
                      type: 'capture',
                      text: `💥 ${currentPlayer.name} playfully sent ${otherPlayer.name}'s token back to base! Bonus roll awarded!`,
                      color: currentPlayer.color
                    };
                  }
                }
              }
            }
          }
        }
      }
    }

    if (dice === 6) {
      extraTurn = true;
    }
  }

  // Clear dice and movable state
  gameState.diceValue = null;
  gameState.movableTokenIds = [];

  // Pass turn or grant extra turn
  if (!extraTurn) {
    passTurnToNextPlayer(gameState);
  } else {
    gameState.lastEvent = {
      ...gameState.lastEvent,
      bonusTurn: true
    };
  }

  return true;
}

export function passTurnToNextPlayer(gameState) {
  gameState.diceValue = null;
  gameState.movableTokenIds = [];
  gameState.consecutiveSixes = 0;

  const totalPlayers = gameState.players.length;
  let nextIndex = (gameState.currentTurnIndex + 1) % totalPlayers;
  let attempts = 0;

  // Skip players who have already won
  while (gameState.players[nextIndex].hasWon && attempts < totalPlayers) {
    nextIndex = (nextIndex + 1) % totalPlayers;
    attempts++;
  }

  if (attempts >= totalPlayers) {
    // All eligible players finished
    return;
  }

  gameState.currentTurnIndex = nextIndex;
  gameState.roundCount++;
}
