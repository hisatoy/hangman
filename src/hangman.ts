console.log("Game Start!!");

import rawData from './data/questions.test.json' assert {type:"json"};

interface Question{
    word : string;
    hint : string;
}

class Quiz {
    questions: Question[];
    //初期化
    constructor(questions: Question[]){
        this.questions = questions;
    }
    
    //次の質問が存在するか確認
    hasNext():boolean{
        return this.questions.length > 0;
    }

    //ランダムに質問を取得して、その質問をリストから削除
    getNext(): Question{
        //0以上、配列の長さ以下のランダムな整数を生成
        const idx = Math.floor(Math.random() * this.questions.length);

        //ランダムなインデックスidxを使って、questions配列から1つの問題を削除
        const [question] = this.questions.splice(idx,1);

        return question;
    }

    //残りの質問数を取得
    lefts(): number{
        return this.questions.length;
    }
}

//Color型を定義
type Color = "red" | "green" | "yellow" | "white";
//Question[]型を指定
const questions: Question[] = rawData; //JSONから読み込んだデータを代入

const quiz = new Quiz(questions);

interface UserInterface{
    //回答者から入力を受け取って返す関数
    input(): Promise<string>;
    clear(): void;
    destroy(): void;
    output(message: string, color?: Color) : void;
    outputAnswer(message: string): void;
}

import readlinePromises from "readline/promises";

//readlinePromisesインターフェイスのインスタンスを生成
const rl = readlinePromises.createInterface({
    input: process.stdin,
    output: process.stdout,
})

//文字色を変更するためにchalkをインポート
import chalk from "chalk";

//文字をアスキーアート形式で出力するためのライブラリをインポート
import figlet from "figlet";

const CLI: UserInterface ={
    async input() {
        const input = await rl.question("文字または単語を推測してください:");
        return input.replaceAll(" ","").toLowerCase();
    },

    clear(){
        // コンソールのクリア
        console.clear();
    },
    destroy(){
        //プロンプトの終了
        rl.close();
    },

    output(message: string, color: Color = "white"){
        console.log(chalk[color](message),"\n");
    },

    outputAnswer(message : string){
        console.log(figlet.textSync(message, {font: "Big"}), "\n");
    }
}

//確認用関数
/*

async function testQuestion() {
    CLI.clear();
    const userInput = await CLI.input();
    console.log(userInput);
    CLI.destroy();
}

testQuestion();
console.log(chalk.green("正解！"));
*/

class Stage{
    answer : string;            //解答の状態
    leftAttempts: number = 5;   //試行回数
    question: Question;         // 出題中の問題

    constructor(question: Question){
        this.question = question;
        //answerにプランク"_"の羅列を設定
        this.answer = new Array(question.word.length).fill("_").join("");
    }

    updateAnswer(userInput: string = ""): void{
        if(!userInput) return;      //空文字の場合、以降の処理は行わない

        const regex = new RegExp(userInput, "g")       //入力を正規表現のパターンとして使用
        const answerArray = this.answer.split("")       //文字列を配列に変換

        let matches: RegExpExecArray | null;           //正規表現での検索結果を格納する変数

        //入力と一致する箇所がなくなるまで繰り返す
        while((matches = regex.exec(this.question.word))){
            const foundIdx = matches.index;
            //対象のインデックスから、一致した箇所を入力された文字と置き換え
            answerArray.splice(foundIdx, userInput.length, ...userInput);

            this.answer = answerArray.join("");         //配列を文字列に変換
        }
    }
    //入力が単語の長さを超えているかチェック
    isTooLong(userInput: string): boolean{
        return userInput.length > this.question.word.length;
    }

    //単語に回答者の入力が含まれるか判定
    isIncludes(userInput: string):boolean{
        return this.question.word.includes(userInput)
    }

    //回答者が単語の文字列全てと一致したか確認
    isCorrect(): boolean{
        return　this.answer === this.question.word;
    }

    //試行回数を一回減少
    decrementAttempts(): number{
        return --this.leftAttempts;
    }

    //試行回数が０か判定
    isGameOver(): boolean{
        return this.leftAttempts === 0;
    }
}

class Message{
    ui : UserInterface;

    constructor(ui: UserInterface){
        this.ui = ui;
    }

    //問題を回答者に表示
    askQuestion(stage: Stage): void{
        this.ui.output(`Hint: ${stage.question.hint}`,"yellow");
        this.ui.outputAnswer(stage.answer.replaceAll(""," ").trim());
        this.ui.output(`(残りの試行回数: ${stage.leftAttempts})`);
    }
    leftQuestion(quiz: Quiz){
        this.ui.output(`残り${quiz.lefts() +1}問`);
    }
    start(){
        this.ui.output("\nGame Start!");
    }
    enterSomething(){
        this.ui.output('何か文字を入力してください', "red");
    }
    notInclude(input: string){
        this.ui.output(`"${input}"は単語に含まれていません`, "red");
    }
    notCorrect(input: string){
        this.ui.output(`残念！"${input}"は正解ではありません`, "red");
    }
    hit(input: string){
        this.ui.output(`"${input}"がHit!`, "green");
    }
    correct(question: Question){
        this.ui.output(`正解！ 単語は"${question.word}"でした`,"green");
    }
    gameOver(question: Question){
        this.ui.output(`正解は ${question.word} でした`);
    }
    end(){
        this.ui.output("ゲーム終了です！お疲れ様でした！");
    }
}

const message = new Message(CLI);   //CLIを渡して初期化

class Game{
    quiz: Quiz;         //ゲーム内でのクイズの情報管理を担当
    message: Message;   //ゲーム内でのメッセージ管理を担当
    stage: Stage;       //現在のゲームステージの情報管理を担当
    ui: UserInterface;  //ゲームのUIとのインタラクションを提供

    constructor(quiz: Quiz, message: Message, ui: UserInterface){
        this.quiz= quiz;
        this.message= message;
        this.ui= ui;
        this.stage = new Stage(this.quiz.getNext());    //初期ステージを設定
    }

    shouldEnd(): boolean{
        //失敗できる上限の回数を超えた場合
        if (this.stage.isGameOver()){
            return true;
        }
        //最終問題（次の問題がない）かつ、正解した場合
        if (!this.quiz.hasNext() && this.stage.isCorrect()){
            return true;
        }

        return false;
    }
    
    next(isCorrect: boolean):GameState{
        //if1 試行回数を減らすかどうかの判断
        if (!isCorrect){
            //推論に間違えた場合
            this.stage.decrementAttempts();
        }
        //if2 ゲームを終了するかの判断
        if (this.shouldEnd()){
            //ゲームを終了すると判断するとき
            return {stage: this.stage, done: true};     //ゲーム終了のためにdoneにtrueを設定する
        }
        //if3 ゲームを新しくするかの判断
        if (isCorrect){
            //推論が完全に一致した場合
            this.stage = new Stage(this.quiz.getNext());    //次のステージの情報を設定
        }

        return { stage: this.stage, done: false };          //ゲームは終了しない
    }

    //内部でawaitを使用しているためasyncで宣言
    async start(): Promise<void>{
        this.ui.clear();
        this.message.start();

        //GameStateの初期値を設定
        let state: GameState = {
            stage: this.stage,
            done: false,
        };

        //ゲームオーバーになるか全ての問題を正解できるまでループ
        while (!state.done){
            if(state.stage === undefined) break;

            const {stage} = state;  //stageオブジェクトを分割代入で取得

            this.message.leftQuestion(this.quiz);//残り何問か表示
            this.message.askQuestion(stage);     //問題を表示

            //回答者の入力を待機
            const userInput = await this.ui.input();

            //入力値チェック
            if(!userInput){
                //入力がない旨のメッセージを表示
                this.message.enterSomething();
                //不正解として扱い、falseを渡してnextを呼び出し、GameStateを更新
                state = this.next(false);
                continue;   //以降の処理を中断し次のループを実行
            }
            //解答状況を最新の状態に更新
            stage.updateAnswer(userInput);

            //入力が正解と完全一致するか判定
            if (stage.isCorrect()){
                this.message.correct(stage.question);   //完全に正解した旨を表示
                state = this.next(true);                //正解したため、trueを渡してnextを呼び出す
                continue;
            }

            //入力の文字数が正解より長いか判定
            if (stage.isTooLong(userInput)){
                this.message.notCorrect(userInput);
                //不正解のため、falseを渡してnextを呼び出す
                state = this.next(false);
                continue;
            }

            //入力が部分的に正解するか判定
            if(stage.isIncludes(userInput)){
                this.message.hit(userInput);
                continue;
            }

            //入力がどの文字にも一致しない場合
            this.message.notInclude(userInput);
            state = this.next(false);

        }
        //試行回数が0か判定
        if (state.stage.isGameOver()){
            this.message.gameOver(this.stage.question);
        }

        this.message.end();

        this.ui.destroy();
    }

}

const game = new Game(quiz,message,CLI);

//ゲーム開始
game.start();

interface GameState{
    stage: Stage;   //現在のステージ情報。質問や解答、試行回数などをもつ
    done: boolean;  //ゲームが終了したかどうかを示すフラグ。trueの場合、ゲームはすでに終了しているとみなされる
}
