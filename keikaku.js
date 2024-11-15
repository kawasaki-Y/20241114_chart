// イベントリスナーでHTMLの要素がすべて準備された状態でJavaScriptが動かす状態を設定
// const businessSelect = document.getElementById("businessSelect");を皮切りに、HTML内の各ボタンや入力欄を情報を取得させる。
// これにより、メニューリストの操作、ボタンを押す、値を入力する、といった動作に反応する処理の準備を整えている。
document.addEventListener("DOMContentLoaded", function () {
  const businessSelect = document.getElementById("businessSelect");
  const yearSelect = document.getElementById("yearSelect");
  const intervalSelect = document.getElementById("intervalSelect");
  const tableBody = document.getElementById("tableBody");
  const chartCanvas = document.getElementById("chart").getContext("2d");
  const saveButton = document.getElementById("saveButton");
  const loadButton = document.getElementById("loadButton");
  const deleteButton = document.getElementById("deleteButton");
  const downloadImageButton = document.getElementById("downloadImageButton");
  const uploadExcelButton = document.getElementById("uploadExcelButton");
  const uploadExcelInput = document.getElementById("uploadExcel");
  let chart;

  // イベントリスナーで各ボタン動作の設定
  // saveButton.addEventListener("click", saveData);のように、保存ボタンを始めとした各ボタンを押したときに特定の関数（saveData、loadDataなど）が動くように設定
  // これにより、データの保存、読み込み、削除、画像DL、フォーマットDL、フォーマットUP、といった操作をボタンを押して行えるようになる
  saveButton.addEventListener("click", saveData);
  loadButton.addEventListener("click", loadData);
  deleteButton.addEventListener("click", deleteData);
  downloadImageButton.addEventListener("click", downloadChartImage);
  uploadExcelButton.addEventListener("click", () => uploadExcelInput.click());
  uploadExcelInput.addEventListener("change", handleExcelUpload);

  // 表とチャートの作成・更新
  // function updateTableAndChart()で表とグラフの内容を作成・更新している。
  // ↑具体的には「年数」「期間（四半期や半年）」に応じて表示する行数や列数を計算して、その数で表のヘッダーと内容を作っている。
  // updateTableHeader()で表のヘッダー部分を作り、例えば2024年の上半期、下半期やQ1、Q2といったように期間を表示している
  // updateTableBody()では表の中身を作り、各事業名の入力欄と期間ごとの数値入力欄を追加している。
  // ↑ユーザーが入力すると、それに合わせて合計やグラフもリアルタイムで更新されるように設定している
  // calculateTotals()で各期間の数値を合計している。これにより、「合計」の行に自動で合計が表示される設定にしている。
  // ↑入力があるたびに自動的に合計が更新されるので、計算の手間が省くことができる。
  // updateChartData()は、入力データを使ってグラフを更新する。
  // ↑特に各事業の名前を凡例に反映する、個々の事業売上と合計の数値をグラフに反映させる、グラフの色を事業ごとに変えて、区別しやすいようした。
  // 今回1番時間を使ったのがここの設計
  function updateTableAndChart() {
    const years = parseInt(yearSelect.value, 10);
    const intervals = intervalSelect.value === "year" ? 1 : intervalSelect.value === "half" ? 2 : 4;
    const periods = years * intervals;
    const businessCount = parseInt(businessSelect.value, 10);

    updateTableHeader(periods, intervals);
    updateTableBody(businessCount, periods);
    calculateTotals();
    updateChartData();
  }

  // 表のヘッダー行を作成。updateTableHeader関数で表の一番上の「ヘッダー行」を作成した。
  // headerRow.innerHTML = "<th>項目</th>";の設定で、左上のセルを「項目」という名前で初期化した。
  // ↑こうしないと、セルの列の表記がズレてしまうため、ここだけ固定にした。
  // 前回の講義で習ったfor (let i = 0; i < periods; i++) {...}を、列のタイトル作成に応用した。
  // ループを回して各列のタイトルを作成するのに活用した。例えば「2024年 Q1」や「2024年 上半期」。
  // ↑periods で表の列数（年数 × 期間区切りの数）を表した。
  // const periodLabel = ...;で期間（四半期や半年など）を計算して、列名を決定する設定
  // ↑具体的には『intervals === 1 → 年単位なら「2024年」』
  // ↑『intervals === 2 → 半期なら「2024年 上半期 / 下半期」。』　　1年を2分割した場合
  // ↑『intervals === 4 → 四半期なら「2024年 Q1 / Q2 / Q3 / Q4」。』　1年を四半期単位で4分割した場合
  // headerRow.innerHTML += ...;で計算した列名をヘッダー行に追加する

  function updateTableHeader(periods, intervals) {
    const headerRow = document.getElementById("headerRow");
    headerRow.innerHTML = "<th>項目</th>";
    for (let i = 0; i < periods; i++) {
      const periodLabel = `${2024 + Math.floor(i / intervals)}年<br>${intervals === 1 ? "" : intervals === 2 ? (i % 2 === 0 ? "上半期" : "下半期") : `Q${(i % 4) + 1}`}`;
      headerRow.innerHTML += `<th>${periodLabel}</th>`;
    }
  }

  // 表の内容を作成。updateTableBody関数で、事業ごとのデータ入力欄を作成した。
  // tableBody.innerHTML = "";で表の内容をいったんリセットする。
  // for (let i = 0; i < businessCount; i++) {...}でbusinessCount（事業数）の分だけ行を作成する。
  // ↑<input type="text">で左端のセルに「事業名」入力欄を設ける
  // ↑<input type="number">で他のセルに数値入力欄を設定
  // <input> に data-row や data-colを付与することで、「どの事業の」「どの期間」のデータかを追跡できる設定
  // totalRow.innerHTML = "<td>合計</td>"で「合計」という名前の行を作り、各列の合計値を表示するセルを追加する

  function updateTableBody(businessCount, periods) {
    tableBody.innerHTML = "";
    for (let i = 0; i < businessCount; i++) {
      const row = document.createElement("tr");
      row.innerHTML = `<td><input type="text" class="business-name" placeholder="事業名 ${i + 1}" data-business="${i}"></td>`;
      for (let j = 0; j < periods; j++) {
        row.innerHTML += `<td><input type="number" class="input-data" data-row="${i}" data-col="${j}" /></td>`;
      }
      tableBody.appendChild(row);
    }
    

    const totalRow = document.querySelector(".total-row");
    totalRow.innerHTML = "<td>合計</td>";
    for (let j = 0; j < periods; j++) {
      totalRow.innerHTML += `<td class="total-data" data-col="${j}">0</td>`;
    }

    // document.querySelectorAll(".input-data").forEach(input => {...});で各入力欄にイベントを追加
    // ↑calculateTotals関数で、再入力時に合計を再計算する設定
    // ↑Enterキーで次の入力欄に移動する設定
    document.querySelectorAll(".input-data").forEach(input => {
      input.addEventListener("input", calculateTotals);
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          const rowIndex = parseInt(input.dataset.row, 10);
          const colIndex = parseInt(input.dataset.col, 10);
          const nextInput = document.querySelector(`.input-data[data-row="${rowIndex + 1}"][data-col="${colIndex}"]`);
          if (nextInput) {
            nextInput.value = ''; // コピーを防止
            nextInput.focus();
          }
        }
      });
    });

    document.querySelectorAll(".business-name").forEach(input => {
      input.addEventListener("input", updateChartData);
    });
  }
  // calculateTotals関数で合計値を計算。各列の合計を計算し、表に反映している。
  // const periods = document.querySelectorAll(".total-data").length;で合計を計算する列の数を取得している。
  // for (let j = 0; j < periods; j++) {...}で、各行についての合計を計算する。
  // [...document.querySelectorAll(...)]で、ある列（data-col="${j}"）に属するすべての入力欄を取得する
  // .reduce((sum, cell) => ...)で入力値を合計する。空白や無効な値は 0 として扱う。
  // document.querySelector(...).textContent = ..で、計算した合計値を合計セルに表示する
  // updateChartData()でグラフを更新する
  function calculateTotals() {
    const periods = document.querySelectorAll(".total-data").length;
    for (let j = 0; j < periods; j++) {
      const total = [...document.querySelectorAll(`.input-data[data-col="${j}"]`)]
        .reduce((sum, cell) => sum + (parseFloat(cell.value) || 0), 0);
      document.querySelector(`.total-data[data-col="${j}"]`).textContent = total.toLocaleString();
    }
    updateChartData();
  }

  // updateChartData関数で、表の内容を元にチャートデータを更新する
  // const labels = [...Array(periods)].map(...)でヘッダー行のタイトルを取得して、グラフの X 軸ラベルに当てはめる。
  // const label：事業名を指定。入力欄から取得する。
  // const date：各期間のデータを指定。入力欄から取得する。
  // borderColor と backgroundColorで事業ごとにグラフカラーを違う色で設定
  // if (chart) chart.destroy(); で以前のグラフを削除する
  // ↑そしてchart = new Chart(...) で新しいグラフを作成する。
  function updateChartData() {
    const businessCount = parseInt(businessSelect.value, 10);
    const periods = document.querySelectorAll(".total-data").length;
    const labels = [...Array(periods)].map((_, i) => document.getElementById("headerRow").children[i + 1].textContent);
    const datasets = [...Array(businessCount)].map((_, i) => {
      const businessName = document.querySelector(`.business-name[data-business="${i}"]`)?.value || `事業名 ${i + 1}`;
      return {
        label: businessName,
        data: [...Array(periods)].map((_, j) => parseFloat(document.querySelector(`.input-data[data-row="${i}"][data-col="${j}"]`)?.value || 0)),
        borderColor: `hsl(${(i * 60) % 360}, 70%, 60%)`,
        backgroundColor: `hsla(${(i * 60) % 360}, 70%, 60%, 0.2)`,
        fill: false,
      };
    });

    const totalData = [...Array(periods)].map((_, j) => parseFloat(document.querySelector(`.total-data[data-col="${j}"]`)?.textContent.replace(/,/g, '') || 0));
    datasets.push({
      label: "合計",
      data: totalData,
      borderColor: "#4db6ac",
      backgroundColor: "rgba(77, 182, 172, 0.2)",
      fill: false,
      borderDash: [5, 5],
    });

    if (chart) chart.destroy();
    chart = new Chart(chartCanvas, {
      type: "line",
      data: { labels, datasets },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: true } } },
    });
  }

  // ローカルストレージを使ってデータの保存
  // JSON 形式で保存
  function saveData() {
    const data = {
      businessData: [...document.querySelectorAll(".input-data")].map(input => input.value),
      businessNames: [...document.querySelectorAll(".business-name")].map(input => input.value)
    };
    localStorage.setItem("businessPlanData", JSON.stringify(data));
    alert("データが保存されました！");
  }

  // ローカルストレージを使ってデータの呼び出し
  // 保存されたデータをローカルストレージから取得して、表に復元する設定
  // 入力欄にデータをセットしてから、calculateTotals() で合計を再計算している
  function loadData() {
    const savedData = JSON.parse(localStorage.getItem("businessPlanData"));
    if (savedData) {
      [...document.querySelectorAll(".input-data")].forEach((input, i) => input.value = savedData.businessData[i] || "");
      [...document.querySelectorAll(".business-name")].forEach((input, i) => input.value = savedData.businessNames[i] || "");
      calculateTotals();
    } else {
      alert("保存されたデータがありません。");
    }
  }

  // ローカルストレージの削除
  function deleteData() {
    localStorage.removeItem("businessPlanData");
    alert("データが削除されました！");
    updateTableAndChart();
  }

  // downloadChartImage関数を使って、チャート画像をダウンロード
  function downloadChartImage() {
    const link = document.createElement("a");
    link.download = "chart.png";
    link.href = chartCanvas.canvas.toDataURL("image/png");
    link.click();
  }

  // handleExcelUploadを活用して、アップロードしたEXCELファイルの読み込みと表への反映
  function handleExcelUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
        updateTableAndChart();
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // updateTableAndChart()関数で、リロード時の初期化を設定
  businessSelect.addEventListener("change", updateTableAndChart);
  yearSelect.addEventListener("change", updateTableAndChart);
  intervalSelect.addEventListener("change", updateTableAndChart);
  updateTableAndChart();
});
