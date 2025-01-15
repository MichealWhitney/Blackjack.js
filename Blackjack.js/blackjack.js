// 2025-01-15
// blackjack.js

const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

let deck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;   // tracks if the current hand being played has ended or not
let playerMoney = 3000;
let currentBet = 0;
let bettingPhase = true;

// stats to display within session stats
let handsPlayed = 0;
let handsWon = 0;
let handsLost = 0;
let netEarnings = 0;

// cursor pos; used to find location to print amount won/lost after a hand has ended (see showMoneyChange func)
let cursorX = 0;
let cursorY = 0;

document.addEventListener('mousemove', (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
});

// Game Logic Functions (lines 30 - 258)
// ************************************************
// ************************************************
// ************************************************
// ************************************************
// ************************************************

function createDeck() {
    // iterates through all suits/values to create single deck of 52 cards
    deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ value, suit });
        }
    }
}

function shuffleDeck() {
    // shuffle deck using fisher yates algorithm (https://www.geeksforgeeks.org/shuffle-a-given-array-using-fisher-yates-shuffle-algorithm/) 
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function getCardValue(card) {
    // determines numeric value of card, so we can determine score for game
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function calculateScore(hand) {
    // calculates total score of cards inside of a hand, w/ logic for aces
    let score = 0;
    let aceCount = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aceCount++;
    }
    while (score > 21 && aceCount > 0) {
        // if score is > 21 and we have an ace, we need to treat the ace as a one.
        // To do this, subtract 10 from the score to treat the ace as a one instead. 
        score -= 10;
        aceCount--;
    }
    return score;
}

function dealCard(hand, elementId, isHidden = false) {
    // Deal a single card to the specified hand, updating UI to reflect card being dealt

    if (deck.length < 10) { // If the deck is running low, automatically shuffle it
        createDeck();
        shuffleDeck();
    }

    const card = deck.pop();
    hand.push(card);

    const cardImage = document.createElement('img');
    // The hidden card is the dealers 2nd card, which is dealt face down. 
    if (isHidden) {
        cardImage.src = `assets/cards/back.png`; // Path to card back image
        cardImage.alt = `Hidden Card`;
        cardImage.classList.add('card', 'hidden-card');
    } else {
        cardImage.src = `assets/cards/${card.value.toLowerCase()}_of_${card.suit.toLowerCase()}.png`;
        cardImage.alt = `${card.value} of ${card.suit}`;
        cardImage.classList.add('card');
    }

    document.getElementById(elementId).appendChild(cardImage);

    // Always add the "show" class to trigger the slide-in animation
    setTimeout(() => cardImage.classList.add('show'), 50);
}

function dealCardsSequentially() {
    // Simulates the dealing of cards at the start of a round, done in predefined sequence 
    // with delay between card dealings for visual clarity

    const sequence = [
        { hand: playerHand, elementId: 'player-cards' },
        { hand: dealerHand, elementId: 'dealer-cards' },
        { hand: playerHand, elementId: 'player-cards' },
        { hand: dealerHand, elementId: 'dealer-cards', isHidden: true }
    ];

    sequence.forEach((deal, index) => {
        setTimeout(() => {
            dealCard(deal.hand, deal.elementId, deal.isHidden);
            if (index === sequence.length - 1) { 
                // After all cards are dealt, give player input and update calculated scores
                updateScores();
                disableGameButtons(false);
            }
        }, index * 500); // Delay of 500ms between each card, to allow animation to finish and player to read card
    });
}

function checkGameStatus() {
    // Determines the outcome of each game hand, updates game state according to this outcome
    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore(dealerHand);

    if (playerScore > 21) {
        // Player Busted
        handsPlayed++;
        handsLost++;
        netEarnings -= currentBet;
        document.getElementById('message').textContent = 'You Bust! Dealer Wins!';
        gameOver = true;
        animateChips('dealer');
        showMoneyChange(-currentBet);

    } else if (dealerScore > 21) {
        // Dealer Busted
        handsPlayed++;
        handsWon++;
        netEarnings += currentBet;
        document.getElementById('message').textContent = 'Dealer Busts! You Win!';
        playerMoney += currentBet * 2;
        gameOver = true;
        animateChips('player');
        showMoneyChange(currentBet * 2);

    } else if (gameOver) { // If neither the player/dealer busts...
        handsPlayed++;

        if (playerScore > dealerScore) {
            // Player wins hand
            handsWon++;
            netEarnings += currentBet;
            document.getElementById('message').textContent = 'You Win!';
            playerMoney += currentBet * 2;
            animateChips('player');
            showMoneyChange(currentBet * 2);

        } else if (playerScore < dealerScore) {
            // Dealer wins hand
            handsLost++;
            netEarnings -= currentBet;
            document.getElementById('message').textContent = 'Dealer Wins!';
            animateChips('dealer');
            showMoneyChange(-currentBet);

        } else { 
            // Push / tie of hands
            document.getElementById('message').textContent = 'It\'s a Tie!';
            playerMoney += currentBet;
            animateChips('player');
            showMoneyChange(currentBet);
        }
    }

    // After this hand is over, "next-hand" button becomes visible. when pressed, this starts a new hand
    if (gameOver) {
        document.getElementById('next-hand').classList.remove('hidden');
        toggleScoreVisibility(true); // Show scores of hands when the game ends
        updateStatsPanel(); // Update stats after each game
    }
    if (playerMoney <= 0) {
        // if player has ran out of money, game over
        document.getElementById('message').textContent = 'Game Over! You\'re out of money!';
        disableGameButtons(true);
    }

    updateMoneyDisplay();
}

function dealerTurn() {
    // Once its dealers turn, unveils the hidden card, and draws cards until the dealers score is at least 17
    const dealerCardsContainer = document.getElementById('dealer-cards');
    const hiddenCard = dealerCardsContainer.querySelector('.hidden-card');

    if (hiddenCard) {
        // Reveal the hidden card by updating the src
        const card = dealerHand[1]; // The second card in the dealers hand is always hidden card
        hiddenCard.src = `assets/cards/${card.value.toLowerCase()}_of_${card.suit.toLowerCase()}.png`;
        hiddenCard.alt = `${card.value} of ${card.suit}`;
    }

    function dealNextCard() {
        // recursive helper function (i hate recursion)
        if (calculateScore(dealerHand) < 17) {
            dealCard(dealerHand, 'dealer-cards');
            updateScores();

            // Continue dealing after a delay
            setTimeout(dealNextCard, 500);
        } else {
            // the dealer has finished drawing cards when their hand is >= 17
            gameOver = true;
            checkGameStatus(); // check who won the hand by calling checkGameStatus()
        }
    }

    // start dealing cards after revealing the hidden card
    setTimeout(dealNextCard, 500);
}

function startNewHand() {
    // resets game state to prepare for a new hand to be played
    // This puts the game into the "betting state", where only elements on page are the betting buttons

    if (deck.length < 10) { // shuffles deck if its low
        createDeck();
        shuffleDeck();
    }

    playerHand = [];
    dealerHand = [];
    gameOver = false;
    bettingPhase = true;

    document.getElementById('player-cards').innerHTML = '';
    document.getElementById('dealer-cards').innerHTML = '';
    document.getElementById('message').textContent = 'Place your bet at the bottom of the page to start!';

    toggleScoreVisibility(false); // Hide scores when starting a new hand

    // Disables the hit/stand buttons, and the game elements from previous hand, enables the betting buttons
    disableGameButtons(true);
    toggleGameElementsVisibility(false);
    toggleBetButtonsVisibility(true);
    document.getElementById('next-hand').classList.add('hidden');
}

// UI Related Functions (lines 260 - 378)
// ************************************************
// ************************************************
// ************************************************
// ************************************************
// ************************************************

function updateScores() {
    // Visually updates the score containers on the page
    document.getElementById('player-score').textContent = `Score: ${calculateScore(playerHand)}`;
    document.getElementById('dealer-score').textContent = `Score: ${calculateScore(dealerHand)}`;
}

function updateMoneyDisplay() {
    // Updates the players balance display
    document.getElementById('player-money').textContent = `Money: $${playerMoney}`;
}

function disableGameButtons(disable) {
    // Disables the hit/stand buttons for the player
    document.getElementById('hit').disabled = disable;
    document.getElementById('stand').disabled = disable;
}

function toggleGameElementsVisibility(show) {
    // Hides the dealer/players hand text, their hands, and the players input buttons
    // Called when we are not in the "game" state, would be called when we are in the betting state for instance.
    const elements = document.querySelectorAll('.hand, .buttons, #dealer-score, #player-score');
    elements.forEach(el => {
        el.classList.toggle('hidden', !show);
    });
}

function updateStatsPanel() {
    // Update the Session Stats
    document.getElementById('hands-played').textContent = handsPlayed;
    document.getElementById('hands-won').textContent = handsWon;
    document.getElementById('hands-lost').textContent = handsLost;
    document.getElementById('net-earnings').textContent = `$${netEarnings}`;
}

function toggleBetButtonsVisibility(show) {
    // Enable/Disable players betting buttons
    const betButtonsContainer = document.querySelector('.bet-buttons-container');
    betButtonsContainer.classList.toggle('hidden', !show);
}

function showMoneyChange(amount) {
    // Prints the amount of money won/lost in the last hand at the posistion of the cursor on the page
    const moneyChange = document.createElement('div');
    moneyChange.textContent = `${amount > 0 ? '+' : ''}${amount}$`;
    moneyChange.classList.add('money-change');
    moneyChange.style.left = `${cursorX}px`;
    moneyChange.style.top = `${cursorY}px`;
    moneyChange.style.color = amount > 0 ? 'green' : 'red'; // Red if player lost, green if they won

    document.body.appendChild(moneyChange);

    // this text slowly drops/fades away from the page, and after 3 seconds is removed
    setTimeout(() => {
        moneyChange.classList.add('fade-out');
        setTimeout(() => {
            moneyChange.remove();
        }, 3000);
    }, 10);
}

function toggleScoreVisibility(visible) {
    // Toggles the hand score for each player on the page
    // Called when the hand/game is over, so player can see the score of each hand
    const playerScoreElement = document.getElementById('player-score');
    const dealerScoreElement = document.getElementById('dealer-score');

    if (visible) {
        playerScoreElement.classList.add('visible');
        dealerScoreElement.classList.add('visible');
    } else {
        playerScoreElement.classList.remove('visible');
        dealerScoreElement.classList.remove('visible');
    }
}

// Renders the casino chips placed on the page when player puts a bet
function renderChips(amount) {
    const chipContainer = document.getElementById('chip-container');
    const chipImages = {
        100: 'assets/chips/100.png',
        500: 'assets/chips/500.png',
        1000: 'assets/chips/1000.png',
    };

    chipContainer.innerHTML = ''; // Clear previous chips

    if (chipImages[amount]) {
        const chip = document.createElement('img');
        chip.src = chipImages[amount];
        chip.classList.add('chip');
        chip.setAttribute('data-bet', amount); // Set data-bet attribute
        chip.style.pointerEvents = 'none';
        chipContainer.appendChild(chip);
    }
}

function animateChips(winner) {
    // Casino chips will slide toward the player who won the hand, and slowly fade away
    const chipContainer = document.getElementById('chip-container');
    const chips = chipContainer.querySelectorAll('img');

    chips.forEach(chip => {
        if (winner === 'player') {
            chip.classList.add('slide-down');
        } else if (winner === 'dealer') {
            chip.classList.add('slide-up');
        }
        setTimeout(() => {
            chipContainer.innerHTML = ''; // Clear after animation ends
        }, 1000);
    });
}

// All EventListener related code (387 - 450)
// ***********************************
// ***********************************
// ***********************************
// ***********************************
// ***********************************

// Logic for pressing any of the bet buttons
document.querySelectorAll('.bet-button').forEach(button => {
    button.addEventListener('click', (event) => {
        const betAmount = parseInt(event.target.dataset.bet);
        if (playerMoney < betAmount) { // if player does not have money to place this bet
            document.getElementById('message').textContent = "Insufficient funds to place this bet!";
            return; // Prevent the bet
        }

        currentBet = betAmount;
        playerMoney -= currentBet; // Deduct the bet immediately
        updateMoneyDisplay(); // Update the displayed balance

        renderChips(currentBet); // Render chips for the bet

        // betting phase is over, move to start the game phase
        bettingPhase = false;
        document.getElementById('current-bet').textContent = `Current Bet: $${currentBet}`;
        document.getElementById('message').textContent = 'Good luck!';
        toggleGameElementsVisibility(true);
        toggleBetButtonsVisibility(false);

        dealCardsSequentially();
    });
});

// Logic for player pressing the hit button
// draws another card to the players hand, if their hands score is >21 check the game status
document.getElementById('hit').addEventListener('click', () => {
    if (!gameOver) {
        disableGameButtons(true); // hitting will start card animation, so we disable ability to press buttons during this time

        dealCard(playerHand, 'player-cards');
        updateScores();

        setTimeout(() => { // determine if hitting caused player to bust
            if (calculateScore(playerHand) > 21) {
                checkGameStatus();
            }

            // if the player has not busted, re-enable buttons for their next input
            if (!gameOver) {
                disableGameButtons(false);
            }
        }, 500); // Match the animation duration
    }
});

// logic for playing hitting the stand button
// simply moves turn to the dealer
document.getElementById('stand').addEventListener('click', () => {
    if (!gameOver) {                // this ensures stand button cannot be pressed after game ends
        disableGameButtons(true);
        dealerTurn(); // let dealer play
    }
});

// logic for "next hand" button
// starts a new hand of blackjack to be played
document.getElementById('next-hand').addEventListener('click', () => {
    if (playerMoney > 0) {
        startNewHand();
    }
});

// initalize game loop
createDeck();
shuffleDeck();
startNewHand();
updateMoneyDisplay();