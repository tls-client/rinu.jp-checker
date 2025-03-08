function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[]/g, "\\$&");
    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

async function check() {
    let load = document.getElementById("loading");
    let detail = document.getElementById("detail");

    load.textContent = "取得中...";
    detail.textContent = "";

    load.classList.remove("red_text");

    let url = document.getElementById("url").value.trim();

    const rinu_regex = /^https?:\/\/rinu\.(cf|jp)\/[\w/:%#\$&\?~\.=\+\-]+$/;
    const toku_regex = /^https?:\/\/(tokutei\.cf|tokutei\.end2end\.tech)\/\?url=[\w/:%#\$&\?~\.=\+\-]+$/;

    if (!rinu_regex.test(url)) {
        load.textContent = "rinu.jpのURLを入力してください。";
        return;
    }

    let url_code;
    try {
        let parsedUrl = new URL(url);
        url_code = parsedUrl.pathname.substring(1); // `/code` の部分を取得
    } catch (e) {
        load.textContent = "無効なURLです。";
        return;
    }

    try {
        let response = await fetch(`https://api.activetk.jp/urlmin/get?code=${url_code}`);
        if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
        
        let dat = await response.json();
        console.log(`Send Code: ${url_code}`);
        console.log(dat);

        if (dat["status"] !== "OK") {
            load.textContent = "エラー";
            detail.textContent = dat["type"] == 404
                ? "URLが存在しません。もう一度お確かめの上、再試行してください。(404)"
                : `申し訳ございません。予期せぬエラーが発生しました。(${dat["type"]})`;
            return;
        }

        let go_url = toku_regex.test(dat["LinkURL"]) ? getParam("url", dat["LinkURL"]) : dat["LinkURL"];

        load.textContent = toku_regex.test(dat["LinkURL"]) ? "特定ツール有" : "特定ツールなし";
        if (toku_regex.test(dat["LinkURL"])) load.classList.add("red_text");

        let last_use_ip = dat["LastUsed"] ? dat["LastUsed"].substring(11) : "不明";
        let creator_ip = dat["CreatorInfo"]["IPAddress"] || "不明";
        let creator_info_url = dat["CreatorInfo"]["MoreInformation"] || "#";
        let creator_timezone = dat["CreatorInfo"]["TimeZone"] || "不明";
        let creator_location = dat["CreatorInfo"]["Location"] || "不明";

        let ipinfo_data = { postal: "不明", org: "不明" };
        if (creator_ip !== "不明") {
            try {
                let ipinfo_response = await fetch(`https://ipinfo.io/${creator_ip}/json`);
                if (ipinfo_response.ok) ipinfo_data = await ipinfo_response.json();
            } catch (e) {
                console.warn("IP情報取得に失敗:", e);
            }
        }

        detail.innerHTML = `
            <b>詳細情報</b><br><br>
            作成者IPアドレス: <a href="${creator_info_url}">${creator_ip}</a><br>
            作成者タイムゾーン: ${creator_timezone}<br>
            IPからわかる場所: ${creator_location}<br>
            郵便番号: ${ipinfo_data["postal"]}<br>
            ASN: ${ipinfo_data["org"]}<br><br>
            遷移先URL: <a href="${go_url}">${decodeURIComponent(go_url)}</a><br>
            作成日: ${dat["CreatedDateTime"]}<br>
            使用回数: ${dat["UsedCount"]}<br>
            最後に使用したユーザーのIPアドレス: <a href="https://ipinfo.io/${last_use_ip}">${last_use_ip}</a>
        `;
    } catch (e) {
        console.error("データ取得中にエラー:", e);
        load.textContent = "データ取得エラー";
        detail.textContent = "サーバーまたはネットワークの問題により、データの取得に失敗しました。";
    }
}

async function paste() {
    let url = document.getElementById("url");
    try {
        let clipText = await navigator.clipboard.readText();
        url.value = clipText;
        check();
    } catch (e) {
        console.warn("クリップボードの読み取りに失敗:", e);
    }
}
