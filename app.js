const Sim = require('pokemon-showdown');
stream = new Sim.BattleStream({keepAlive: true}); // 連続で対戦を行うときはkeepAliveオプションが必要

/*********************************************************************
 * 対戦インスタンスの設定 (好きな値に調整)
 * *******************************************************************/
const NUM_OF_BATTLES = 10;

const battleFormat = {
    formatid:"gen8randombattle" // 対戦ルールを表す内部IDを指定
}

const p1 = {
    name:"プレイヤー1"
}

const p2 = {
    name:"プレイヤー2"
}

/*********************************************************************
 * 集計用 (特別な意味はありません)
 * *******************************************************************/
let battleCount = 0;

const winCount = {
    [p1.name]: 0,
    [p2.name]: 0
}

/*********************************************************************
 * BattleStream操作用ロジック
 * *******************************************************************/
function writeAndLog(command) {
    console.log(`>> ${command}`)
    stream.write(`>${command}`) // > を先頭につけるのを忘れずに
}

function startNewBattle() {
    console.log(`新規の対戦を開始します(${battleCount + 1}回目)…`);
    writeAndLog(`start ${JSON.stringify(battleFormat)}`)
    writeAndLog(`player p1 ${JSON.stringify(p1)}`)
    writeAndLog(`player p2 ${JSON.stringify(p2)}`)
}

// メガシンカ、ダイマックスも含めて正確に行動選択を制御する場合は、choiceRequestの構造の把握が必要
// https://github.com/smogon/pokemon-showdown/tree/master/sim
function onChoiceRequest(choiceRequest) {
    const player = choiceRequest.side.id
    if (choiceRequest.forceSwitch) { // 死に出し選択状態
        writeAndLog(`${player} default`) // 例としてリスト一番上のポケモンに交代
        return
    } else if (choiceRequest.wait) { // 行動選択なし (例)げきりんの発動中
        return
    } else if (choiceRequest.teamPreview) { // 選出選択、一部ルールでは存在
        // 選出選択が存在するルールでは適当なロジックを書く
        return
    } else if (!choiceRequest.active) {
        return
    }

    const availableMoves = choiceRequest.active[0].moves.filter(move => !move.disabled)
    const rand = Math.floor((Math.random() * availableMoves.length)) // 例としてランダム技選択
    const move = availableMoves[rand];
    writeAndLog(`${player} move ${move.id}`)
}

function onBattleWin(winnerName) {
    console.log(`対戦結果: ${winnerName}の勝ち`)
    winCount[winnerName]++
    battleCount++
}

// 参考: シミュレータープロトコル
// https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md
const streamOutputHandler = async () => {
    for await (const output of stream) { // cf. async iterables 
        console.log(`<< ${output}`)
        const lines = output.split('\n')

        if (lines[0] === 'end') {
            if (battleCount < NUM_OF_BATTLES) {
                startNewBattle();
            } else {
                console.log('すべての対戦が終了しました。');
                console.log('勝利数:')
                console.log(winCount);
            }
            continue;
        }

        lines.forEach(line => {
            const records = line.split('|')
            if (records.length < 2) {
                return;
            }

            switch (records[1]) {
                case 'request':
                    const request = JSON.parse(records[2])
                    onChoiceRequest(request)
                break;
                case 'win':
                    onBattleWin(records[2])
                break;
                default:
                    return;
            }

        });
    }
};
streamOutputHandler();
startNewBattle();
