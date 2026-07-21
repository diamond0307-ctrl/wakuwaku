/**
 * おかね日記 → スプレッドシート自動保存用スクリプト（削除同期対応版）
 *
 * 【更新方法（既にデプロイ済みの場合）】
 * 1. このファイルの内容を全部コピーして、Apps Scriptエディタの「コード.gs」に
 *    今までの内容と入れ替える形で貼り付ける
 * 2. 上部の「デプロイ」→「デプロイを管理」を開く
 * 3. 既存のデプロイの鉛筆アイコン（編集）をクリック
 * 4. 「バージョン」を「新バージョン」にして「デプロイ」
 *    → ウェブアプリのURLは変わらないので、アプリ側の再設定は不要です
 *
 * 【新規の場合】
 * 1. スプレッドシートの「拡張機能 > Apps Script」を開く
 * 2. デフォルトのコードを全部消して、このファイルの内容を貼り付ける
 * 3. 「デプロイ > 新しいデプロイ」→ 種類「ウェブアプリ」
 *    「次のユーザーとして実行」→ 自分 / 「アクセスできるユーザー」→ 全員
 * 4. 発行された「ウェブアプリのURL」をClaudeに伝える
 */

const SHEET_NAME = "シート1"; // 書き込み先のシート名。違う場合はここを変更してください
const HEADER = ["記録日時", "日付", "項目", "金額", "メモ", "ID"];
const ID_COLUMN = 6; // ID列（F列）の列番号

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getTargetSheet_();

    if (data.action === "delete") {
      deleteRowById_(sheet, data.id);
      return jsonOutput_({ result: "success", action: "delete" });
    }

    // 既定の動作：追加
    const now = new Date();
    sheet.appendRow([
      Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd HH:mm:ss"),
      data.date || "",
      data.category || "",
      data.amount || "",
      data.memo || "",
      data.id || "",
    ]);
    return jsonOutput_({ result: "success", action: "add" });
  } catch (err) {
    return jsonOutput_({ result: "error", message: String(err) });
  }
}

function getTargetSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0]; // シート名が見つからない場合は先頭のシートに書く
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
  }
  return sheet;
}

function deleteRowById_(sheet, id) {
  if (!id) return;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const idValues = sheet.getRange(2, ID_COLUMN, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      sheet.deleteRow(i + 2); // ヘッダー分+1、0始まり分+1
      break;
    }
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ブラウザで直接開いた時の動作確認用（任意）
function doGet() {
  return ContentService.createTextOutput("OK: おかね日記の受け口は動作しています");
}
