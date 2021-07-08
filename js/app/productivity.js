var dataTable = null;
var ctx2 = null;
var chart = null;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

$.ajax({
   url: 'https://dashboard.8thsensus.com:8080/message',
   headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
   },
   type: "GET",
   dataType: "json",
   contentType: 'application/json',
   data: {
   },
   success: function (result) {
      let usersData = alasql(`
         SELECT userid
         FROM ?
         GROUP BY userid
      `, [result]);

      let slctUsersHtml = `<option value=""></option>`;

      usersData.forEach(user => {
         slctUsersHtml += `
            <option value="${user.userid}">${user.userid}</option>
         `;
      });

      $("#slctUserId").html(slctUsersHtml);
   },
   error: function (request, status, error) {
      console.error(error);
   }
});

getproductivityData();

function getproductivityData() {
   $.ajax({
      url: "https://dashboard.8thsensus.com:8080/message",
      headers: {
         "Content-Type": "application/x-www-form-urlencoded",
      },
      type: "GET",
      dataType: "json",
      data: {},
      success: function (result) {
         let slctDateRange = document.getElementById("slctDateRange").value == "" ? 1
            : document.getElementById("slctDateRange").value;
         let slctUserId = document.getElementById("slctUserId").value;
         let dateFrom = formatDate(new Date().addDays(-slctDateRange));
         let dateTo = formatDate(new Date());
         let timeInterval = getTimeInterval(slctDateRange);
         let timeIntervalFormat = parseInt(slctDateRange) == 1 ? "SUBSTRING(timeInterval, 12,13) + ' hrs'" : "SUBSTRING(timeInterval, 1,10)";

         let arrLock = [];
         let userData = alasql(`
            SELECT
               CASE 
                  WHEN diagcode IN ('D0001','D0002','D0006','D0014','D0011','D0010','D0013') THEN 0
                  WHEN diagcode IN ('D0003','D0004','D0005','D0007','D0008','D0009','D0012','D0015') THEN 1
               END [locked]
               ,userid
               ,stamp [date]
               ${timeInterval}
            FROM ? 
            WHERE utc >= '${dateFrom}' AND utc <='${dateTo}' 
            ${slctUserId !== "" ? " AND userid = '" + slctUserId + "'" : ""}
            ORDER BY userid, stamp
         `, [result]);

         userData.forEach(function (d, idx) { d.rownum = idx });

         // console.table(userData);

         for (let i = 0; i < userData.length; i++) {
            let actualData = userData[i];

            if (i > 0) {
               let nextData = userData[i + 1];
               if (nextData !== undefined && (actualData.locked != nextData.locked || actualData.userid != nextData.userid)) {
                  arrLock.push(nextData);
               }
            }
            else
               arrLock.push(actualData);
         }

         for (let i = 0; i < arrLock.length; i++) {
            let actualData = arrLock[i];

            if (i != arrLock.length - 1) {
               let nextData = arrLock[i + 1];
               if (actualData.userid == nextData.userid) {
                  if (actualData.locked == 0) { // UNLOCKED TIME
                     arrLock[i].unlockedTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
                     arrLock[i].lockedTime = 0;
                  }
                  else { // LOCKED TIME
                     arrLock[i].unlockedTime = 0
                     arrLock[i].lockedTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
                  }
               }
            }
         }

         //console.table(arrLock); // TIMES
         
         let activeInactiveData = alasql(`
            SELECT  SUBSTRING(date, 1, 10) [date], SUM(unlockedTime) unlockedMs, SUM(lockedTime) lockedMs,
               ${timeIntervalFormat} AS [timeInterval]
            FROM ? 
            GROUP BY SUBSTRING(date, 1, 10), ${timeIntervalFormat}
            ORDER BY [timeInterval]
         `, [arrLock])

         activeInactiveData.forEach(item => {
            item.UnlockedTime = msToTime(item.unlockedMs);
            item.LockedTime = msToTime(item.lockedMs);
         });

         //console.table(activeInactiveData); // FINAL RESULT

         createGraph(activeInactiveData);
      },
      error: function (err) {
         console.error(err);
      }
   });
}

function createGraph(graphData) {
   var barData = {
      labels: getGraphLabels(graphData),
      datasets: [
         {
            label: "Locked",
            backgroundColor: "rgba(220, 220, 220, 0.5)",
            pointBorderColor: "#fff",
            data: getGraphLockValues(graphData),
         },
         {
            label: "Unlocked",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphUnlockValues(graphData),
         },
      ]
   };

   var barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
         yAxes: [
            {
               ticks: {
                  beginAtZero: true,
                  callback: function (label, index, labels) {
                     return msToTime(label);
                  }
               }
            }
         ]
      },
      tooltips: {
         callbacks: {
            label: function (tooltipItem) {
               return msToTime(tooltipItem.yLabel);
            }
         }
      },
   };

   if (ctx2 !== null)
      ctx = null;
   if (chart !== null)
      chart.destroy();
      
   ctx2 = document.getElementById("barChart").getContext("2d");
   chart = new Chart(ctx2, { type: "bar", data: barData, options: barOptions });
}

function getGraphLabels(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.timeInterval);
   });
   return result;
}

function getGraphLockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.lockedMs);
   });
   return result;
}

function getGraphUnlockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.unlockedMs);
   });
   return result;
}

function formatDate(utcDate) {
   let d = new Date(utcDate);
   let month =
      d.getMonth().toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
   let day =
      d.getDate().toString().length == 1 ? "0" + d.getDate() : d.getDate();
   let hour =
      d.getHours().toString().length == 1 ? "0" + d.getHours() : d.getHours();
   let min =
      d.getMinutes().toString().length == 1
         ? "0" + d.getMinutes()
         : d.getMinutes();
   let sec =
      d.getSeconds().toString().length == 1
         ? "0" + d.getSeconds()
         : d.getSeconds();
   return (
      d.getFullYear() +
      "-" +
      month +
      "-" +
      day +
      " " +
      hour +
      ":" +
      min +
      ":" +
      sec
   );
}

function msToTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
}

function msToDateTime(s) {
   function pad(n, z) {
      z = z || 2;
      return ('00' + n).slice(-z);
   }

   var ms = s % 1000;
   s = (s - ms) / 1000;
   var secs = s % 60;
   s = (s - secs) / 60;
   var mins = s % 60;
   var hrs = (s - mins) / 60;

   let dateNow = new Date();
   return new Date(dateNow.getFullYear(), dateNow.getMonth(), dateNow.getDate(), pad(hrs), pad(mins), pad(secs), 0);
}

function getTimeInterval(range) {
   switch (parseInt(range)) {
      case 1:
         return ",SUBSTRING(stamp, 1, 13) [timeInterval]";
      case 7:
      case 14:
      case 30:
         return ",SUBSTRING(stamp, 1, 10) [timeInterval]";
      default:
         console.log(range);
         break;
   }
}


//if (dataTable !== null)
//    dataTable.destroy();

// dataTable = $('#example').DataTable({
//    data: activeInactiveData,
//    destroy: true,
//    columns: [
//       { data: "userid" },
//       { data: "date" },
//       { data: "ActiveHours" },
//       { data: "InactiveHours" },
//       { data: "activeTime" },
//    ],
//    columnDefs: [
//       {
//          "targets": [4],
//          "visible": false,
//          "searchable": false
//       }
//    ],
//    order: [[1, "desc"]],
//    select: true,
//    pageLength: 10,
//    responsive: true,
//    dom: '<"top"i>rt<"bottom"flp><"html5buttons"B><"clear">',
//    retrieve: true,
//    searching: false,
//    buttons: [
//       { extend: 'copy' },
//       { extend: 'csv' },
//       { extend: 'excel', title: 'ExampleFile' },
//       { extend: 'pdf', title: 'ExampleFile' },
//       {
//          extend: 'print',
//          customize: function (win) {
//             $(win.document.body).addClass('white-bg');
//             $(win.document.body).css('font-size', '10px');

//             $(win.document.body).find('table')
//                .addClass('compact')
//                .css('font-size', 'inherit');
//          }
//       }
//    ]
// });