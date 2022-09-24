const X_GRID_DIMENSION = 40;
const MINE_DENSITY = 0.15;
const GRID_SIZE = Math.floor(window.innerWidth/X_GRID_DIMENSION);
const X_PADDING = window.innerWidth - X_GRID_DIMENSION*GRID_SIZE;
const Y_GRID_DIMENSION = Math.floor(window.innerHeight/GRID_SIZE);

const states = {
    emptyState: [0, "empty-state"],
    mineClickedState: [1, "mine-clicked-state"],
    hiddenMineState: [2, "mine"],
    emptyClickedState: [3, "empty-clicked-state"],
}

var boardMatrix = Array.from(Array(Y_GRID_DIMENSION), () => new Array(X_GRID_DIMENSION).fill(states.emptyState[0]));
var waitingForFirst = true;

function getCellElement(x, y) {
    let col = document.querySelector('[data-row-index="' + y + '"]');
    if (col == null) {return null}

    let results = col.querySelector('[data-x="' + x + '"]');

    if (results == null) {return null}
    return results;
}

function changeVisibleCellState(x, y, state) {
    let target = getCellElement(x, y);

    if (target==null) {return}

    boardMatrix[y][x] = state[0];

    for (let state in states) {
        target.classList.remove(states[state][1]);
    }

    target.classList.add(state[1]);
}

function adjacentCells(x, y) {
    let relativePositions = [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [1, -1], [-1, 1], [-1, -1]];
    let adjacentPositions = [];

    for (let relPos of relativePositions) {
        let adj = [x+relPos[0], y+relPos[1]];

        if (adj[0] < 0 || adj[0] > X_GRID_DIMENSION-1 || adj[1] < 0 || adj[1] > Y_GRID_DIMENSION-1) {continue}

        adjacentPositions.push(adj);
    }
    return adjacentPositions;
}

function getAdjacentMineCount(x, y) {
    let edgeAdjacents = adjacentCells(x, y);
    let count = 0

    for (let adjacent of edgeAdjacents) {
        if (boardMatrix[adjacent[1]][adjacent[0]] == states.hiddenMineState[0]) {
            count++;
        }
    }

    return count;
}

function generateMines() {
    let bombCount = Math.round(MINE_DENSITY*X_GRID_DIMENSION*Y_GRID_DIMENSION);

    let xPos, yPos, element;
    for (let placedCount = 0; placedCount<bombCount; ) {
        xPos = Math.floor(Math.random()*X_GRID_DIMENSION);
        yPos = Math.floor(Math.random()*Y_GRID_DIMENSION);

        if (boardMatrix[yPos][xPos] == states.hiddenMineState[0]) {continue}

        changeVisibleCellState(xPos, yPos, states.hiddenMineState);
        placedCount++;
    }


}

function calculateBestMove(adjacencyMatrix) {
    let probabilityMatrix = Array.from(Array(Y_GRID_DIMENSION), () => new Array(X_GRID_DIMENSION).fill(0));

    for (let row_n = 0; row_n < boardMatrix.length; row_n++) {
        let row = boardMatrix[row_n];
        for (let col_n = 0; col_n < row.length; col_n++) {
            let col = row[col_n];
            if (col != states.emptyClickedState[0]) {continue}

            let currentAdjacent = adjacencyMatrix[row_n][col_n];

            let allAdjacent = adjacentCells(col_n, row_n);
            let emptyCells = allAdjacent.filter(elem => boardMatrix[elem[1]][elem[0]] == states.emptyState[0]);
            if (emptyCells.length == 0) {continue}

            let safeChance = 1 - currentAdjacent/emptyCells.length;

            for (let emptyCell of emptyCells) {
                let currentProbability = probabilityMatrix[emptyCell[1]][emptyCell[0]];
                if (currentProbability == 0) {currentProbability = 1};
                let newProb = currentProbability*safeChance
                probabilityMatrix[emptyCell[1]][emptyCell[0]] = newProb;
            }
        }
    }

    // choose max of prob matrix
    let runningMax = -9999;
    let runningMaxPos = [];
    for (let row_n = 0; row_n < probabilityMatrix.length; row_n++) {
        let row = probabilityMatrix[row_n];
        for (let col_n = 0; col_n < row.length; col_n++) {
            let prob = row[col_n];
            if (prob >= runningMax) {
                runningMax = prob;
                runningMaxPos = [col_n, row_n]
            }
        }
    }
    return runningMaxPos;
}

function updateMineAdjacency() {
    let adjacencyMatrix = Array.from(Array(Y_GRID_DIMENSION), () => new Array(X_GRID_DIMENSION).fill(0));

    for (let row_n = 0; row_n < boardMatrix.length; row_n++) {
        let row = boardMatrix[row_n];
        for (let col_n = 0; col_n < row.length; col_n++) {
            let col = row[col_n];

            if (col != states.emptyClickedState[0]) {continue}

            let adjacentCount = getAdjacentMineCount(col_n, row_n);
            adjacencyMatrix[row_n][col_n] = adjacentCount;

            let cellElement = getCellElement(col_n, row_n);
            let existingText = cellElement.getElementsByClassName("adjacency-text");

            if (existingText.length != 0) {existingText[0].remove()}

            if (adjacentCount > 0) {
                let textElement = document.createElement("text");
                textElement.innerText = adjacentCount;
                textElement.classList.add("adjacency-text");

                cellElement.appendChild(textElement);
            }
        }
    }
    return adjacencyMatrix;
}

function firstClick(event) {
    waitingForFirst = false;

    let positionX = Number(event.target.dataset.x);
    let positionY = Number(event.target.dataset.y);

    changeVisibleCellState(positionX, positionY, states.emptyClickedState);

    generateMines();

    // start at a 3x3 grid around click
    let expandingCells = [...adjacentCells(positionX, positionY)];

    while (expandingCells.length>0) {
        let startLength = expandingCells.length;

        // backwards for deleting
        for (let i = startLength-1; i>=0; i--) {
            let currentCell = expandingCells[i]
            changeVisibleCellState(currentCell[0], currentCell[1], states.emptyClickedState)

            if (getAdjacentMineCount(currentCell[0], currentCell[1]) > 0) {
                expandingCells.splice(i, 1);
            }
        }

        let nextExpandingCells = [];
        for (let currentCell of expandingCells) {
            let allAdjacentToCurrent = adjacentCells(currentCell[0], currentCell[1]);

            for (let adjacentToCurrent of allAdjacentToCurrent) {
                // check if cell already in array
                let addedAlready = nextExpandingCells.find(elem => elem[0] == adjacentToCurrent[0] && elem[1] == adjacentToCurrent[1]);
                if (addedAlready || boardMatrix[adjacentToCurrent[1]][adjacentToCurrent[0]] != states.emptyState[0]) {continue}
                nextExpandingCells.push(adjacentToCurrent);
            }


        }
        expandingCells = nextExpandingCells;
    }
    updateMineAdjacency();
}

function cellClicked(event) {
    if (waitingForFirst) {firstClick(event); return}

    let positionX = Number(event.target.dataset.x);
    let positionY = Number(event.target.dataset.y);

    let state = boardMatrix[positionY][positionX];
    if (state == states.hiddenMineState[0] || state == states.mineClickedState[0]) {
        changeVisibleCellState(positionX, positionY, states.mineClickedState);

        setTimeout(function() {location.reload()}, 10)

    } else {
        changeVisibleCellState(positionX, positionY, states.emptyClickedState);
    }
}

function botChooseActionLoop() {
    let adj = updateMineAdjacency();
    let move = calculateBestMove(adj);

    cellClicked({target: {dataset: {x: move[0], y: move[1]}}})

    setTimeout(botChooseActionLoop, 100);
    updateMineAdjacency()
}

function startBot() {
    let xPos = Math.floor(Math.random()*X_GRID_DIMENSION);
    let yPos = Math.floor(Math.random()*Y_GRID_DIMENSION);

    cellClicked({target: {dataset: {x: xPos, y: yPos}}})

    botChooseActionLoop();
}

function setUp() {
    let container = document.getElementById("game-parent");
    container.style.paddingLeft = X_PADDING/2 + "px";
    container.style.paddingRight = X_PADDING/2 + "px";

    let table = document.getElementById("game-table");
    for (let rowI = 0; rowI<Y_GRID_DIMENSION; rowI++) {
        let rowElement = document.createElement("tr");
        rowElement.classList.add("minesweeper-row");
        rowElement.setAttribute("data-row-index", rowI);

        for (let colI = 0; colI<X_GRID_DIMENSION; colI++) {
            let cell = document.createElement("div");

            cell.style.width = GRID_SIZE + "px";
            cell.style.height = GRID_SIZE + "px";

            cell.classList.add("cell");
            cell.classList.add(states.emptyState[1]);

            cell.setAttribute("data-x", colI);
            cell.setAttribute("data-y", rowI);

            cell.addEventListener("click", cellClicked);

            rowElement.appendChild(cell);
        }

        table.appendChild(rowElement);
    }
    startBot()
}

window.onload = setUp