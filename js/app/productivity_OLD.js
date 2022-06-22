var dataTable = null;
var weekDataTable = null;
var ctx2 = null;
var chart = null;
var selectedUsers = [];
var selectedDeps = [];
var dateFrom = moment().add(-1, 'days').format('YYYY-MM-DDT00:00:00');
var dateTo = moment().format('YYYY-MM-DDT23:59:59');
var slctDateRange = 1;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

$(function () {
   $('[data-toggle="tooltip"]').tooltip()
});

document.getElementById("loader").classList.add("show-loader");

$(function () {
   $('input[name="daterange"]').daterangepicker({
      autoApply: true,
      opens: 'left',
      minDate: new Date().addDays(-30),
      maxDate: new Date(),
      startDate: new Date().addDays(-1),
      endDate: new Date(),
   }, function (start, end) {
      let startD = start.format('YYYY-MM-DD');
      let endD = end.format('YYYY-MM-DD');

      dateFrom = start.format('YYYY-MM-DDTHH:mm:ss');
      dateTo = end.format('YYYY-MM-DDT23:59:59');

      slctDateRange = moment(endD, 'YYYY-MM-DD').diff(moment(startD, 'YYYY-MM-DD'), 'days') + 1;
   });
});

init();

async function init() {
   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());
   let hr = JSON.parse(await getHumanResourceAll());

   let resultA = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${webConfig.customerFilter}'
   `, [res, resa]);

   let resultB = alasql(`
      SELECT userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${webConfig.customerFilter}'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   let result = alasql(`
      SELECT userid, id, key, customerid, h.department, h.anchorGPS, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      INNER JOIN ? h
      ON r.userid = h.userId
      `, [resultB, hr]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let usersData = alasql(`
      SELECT UPPER(userid) [userid]
      FROM ?
      GROUP BY UPPER(userid)
      ORDER BY userid
   `, [result]);

   let slctUsersHtml = `<option value="0">Select a user</option>`;

   usersData.forEach(user => {
      slctUsersHtml += `
         <option value="${user.userid}">${user.userid.toUpperCase()}</option>
      `;
   });
   slctUsersHtml += '</select>';

   $("#slctUserId").html(slctUsersHtml);

   let departmentsData = alasql(`
      SELECT UPPER(department) [department]
      FROM ?
      GROUP BY UPPER(department)
      ORDER BY department
   `, [result]);

   let slctDepartmentHtml = `
      <label for="slctDepartment">Department:</label>
      <select name="slctDepartment[]" multiple id="slctDepartment">`;

   departmentsData.forEach(dep => {
      slctDepartmentHtml += `
         <option value="${dep.department}">${dep.department.toUpperCase()}</option>
      `;
   });
   slctDepartmentHtml += '</select>';

   $("#slctDepContainer").html(slctDepartmentHtml);
   $('#slctDepartment').multiselect({
      columns: 1,
      placeholder: 'Select Department',
      search: true,
      selectAll: true
   });

   $(".ms-selectall").trigger("click");
   getproductivityData(result);
}

function setCheckValue(val, checked) {
   if (checked) {
      selectedDeps.push(val);
   }
   else {
      let index = selectedDeps.indexOf(val);
      if (index > -1) {
         selectedDeps.splice(index, 1);
      }
   }
}

async function getproductivityData(result = null) {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");

   if (result == null) {
      let res = JSON.parse(await getMessage());
      let resa = JSON.parse(await getActionsAll());
      let hr = JSON.parse(await getHumanResourceAll());

      let slctUserId = document.getElementById("slctUserId").value;

      let resultA = alasql(`
         SELECT 
            CASE 
               WHEN NOT LEN(a.userId) >= 0 THEN r.userid
               ELSE a.userId
            END [userid],
            r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
         FROM ? r
         LEFT JOIN ? a 
         ON r.machinename IN a.machineName
         WHERE customerid = '${webConfig.customerFilter}'
      `, [res, resa]);

      let resultB = alasql(`
         SELECT userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
         FROM ? r
         WHERE customerid = '${webConfig.customerFilter}'
         GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
         `, [resultA]);

      let resultC = alasql(`
         SELECT r.userid, r.id, r.key, r.customerid, h.department, h.anchorGPS, r.mac, r.remoteip, r.diagcode, r.version, r.machinename, r.devicelist, r.confidence, r.type, r.os, r.hardware, r.applications, r.perfcounters, r.localip, r.gps, r.utc, r.stamp
         FROM ? r
         INNER JOIN ? h
         ON r.userid = h.userId
         `, [resultB, hr]);

      let result = alasql(`
         SELECT * FROM ?
         ${slctUserId !== "" && slctUserId !== "0" ? " WHERE UPPER(userid) = '" + slctUserId + "'" : ""}
         `, [resultC, hr]);

      ProcessData(result);
   }
   else {
      ProcessData(result);
   }
}

async function ProcessData(result) {

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let dateRangeString = document.getElementById("inptDateRange").value;
   let timeInterval = getTimeInterval(slctDateRange);
   let timeIntervalFormat = parseInt(slctDateRange) == 1 ? "SUBSTRING(timeInterval, 12,13) + ':00'" : "SUBSTRING(timeInterval, 1,10)";
   let slctUsersId = "";
   let slctDeps = "";
   let arrLock = [];
   let dates = [];
   let labelData = {
      totalEmployes: 0,
      avgHours: 0,
      mostActive: "",
      leastActive: ""
   }

   // if (selectedUsers.length == 0) {
   //    let usersData = alasql(`
   //       SELECT userid
   //       FROM ?
   //       GROUP BY userid
   //    `, [result]);
   //    labelData.totalEmployes = selectedUsers.length;
   //    usersData.forEach(user => selectedUsers.push(user.userid));
   //    selectedUsers.forEach(user => slctUsersId += `'${user}',`);
   // } else
   //    labelData.totalEmployes = selectedUsers.length - 1;
   // selectedUsers.forEach(user => slctUsersId += `'${user}',`);


   if (selectedDeps.length == 0) {
      let depsData = alasql(`
         SELECT UPPER(department) [department]
         FROM ?
         GROUP BY UPPER(department)
         ORDER BY department
      `, [result]);

      depsData.forEach(dep => selectedDeps.push(dep.department));
      selectedDeps.forEach(dep => slctDeps += `'${dep}',`);
   } else
      selectedDeps.forEach(dep => slctDeps += `'${dep}',`);

   if (slctDateRange == 1) {
      dates.push(dateFrom.substring(0, 10));
      dates.push(dateTo.substring(0, 10));
   }
   else
      for (let i = 0; i < slctDateRange; i++) {
         let dt = formatDate(new Date().addDays(-i)).toString();
         dates.push(dt.substring(0, 10));
      }

   let userData = alasql(`
      SELECT
         CASE 
            WHEN diagcode IN ('D0016') THEN 1
            WHEN diagcode IN ('D0017') THEN 0
            ELSE  diagcode
         END [activeStatus]
         ,UPPER(userid) [userid]
         ,version
         ,department
         ,anchorGPS
         ,utc [date]
         ,WEEKDAY(utc) [weekday]
         ${timeInterval}
      FROM ? 
      WHERE utc >= '${dateFrom}' AND utc <='${dateTo}'
      ORDER BY userid, utc
   `, [result]);
   userData.forEach(function (d, idx) { d.rownum = idx });

   console.table(userData);

   for (let i = 0; i < userData.length; i++) {
      let actualData = userData[i];

      if (i > 0) {
         let nextData = userData[i + 1];
         if (nextData !== undefined && (actualData.activeStatus != nextData.activeStatus || actualData.userid != nextData.userid)) {
            arrLock.push(nextData);
         }
      }
      else
         arrLock.push(actualData);
   }

   // console.table(arrLock);

   for (let i = 0; i < arrLock.length; i++) {
      let actualData = arrLock[i];
      arrLock[i].weekday = getWeekDay(arrLock[i].weekday);
      arrLock[i].weeknumber = moment(arrLock[i].timeInterval).week();

      if (i != arrLock.length - 1) {
         let nextData = arrLock[i + 1];
         if (actualData.userid == nextData.userid && actualData.timeInterval.substring(0, 10) == nextData.timeInterval.substring(0, 10)) {
            if (actualData.activeStatus == 1) { // ACTIVE TIME
               arrLock[i].activeTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
               arrLock[i].inactiveTime = 0;
            }
            else { // INACTIVE TIME
               arrLock[i].activeTime = 0;
               arrLock[i].inactiveTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
            }
         }
      }
   }

   // console.table(arrLock);

   let activeInactiveDatabyUser = alasql(`
      SELECT userid, MAX(version) version, department, anchorGPS, '${dateRangeString.split('-')[0].trim()}' [from], '${dateRangeString.split('-')[1].trim()}' [to] ,SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs, MAX(rownum) rownum
      FROM ? 
      GROUP BY userid, department, anchorGPS
      ORDER BY userid
   `, [arrLock]);

   // console.table(activeInactiveDatabyUser);

   let activeInactiveDataJoin = alasql(`
      SELECT a.userid, a.version, a.department, a.anchorGPS, a.[from], a.[to], a.activeMs, a.inactiveMs, a.rownum, b.activeStatus
      FROM ? a
      INNER JOIN ? b
      ON a.rownum = b.rownum
      WHERE UPPER(a.department) IN (${slctDeps}'')
      GROUP BY a.userid, a.version, a.department, a.anchorGPS, a.[from], a.[to], a.activeMs, a.inactiveMs, a.rownum, b.activeStatus
      ORDER BY a.department
   `, [activeInactiveDatabyUser, arrLock]);

   // AND UPPER(userid) IN (${slctUsersId}'') 
   // console.table(activeInactiveDataJoin);

   activeInactiveDataJoin.forEach(item => {
      item.activePer = item.activeMs * 100 / 28800000;
      item.activeTime = msToTime(item.activeMs);
      item.inactiveTime = msToTime(item.inactiveMs);
   });

   if (arrLock.length > 0) {
      let date = arrLock[0].date;
      let userId = arrLock[0].userid;
      let actualHour = new Date().getHours();

      for (let dt = 0; dt < dates.length; dt++) {
         if (parseInt(slctDateRange) === 1) {
            for (let hr = 0; hr < 24; hr++) {
               if ((dt == 0 && hr >= actualHour) || (dt == 1 && hr <= actualHour)) {
                  let timeI = date.substring(0, 11);
                  arrLock.push({
                     activeStatus: 1,
                     activeTime: 0,
                     date: dates[dt],
                     inactiveTime: 0,
                     rownum: 0,
                     timeInterval: hr.toString().length == 1 ? timeI + "0" + hr.toString() : timeI + hr.toString(),
                     userid: userId
                  });
               }
            }
         }
         else {
            arrLock.push({
               activeStatus: 1,
               activeTime: 0,
               date: dates[dt],
               inactiveTime: 0,
               rownum: 0,
               timeInterval: dates[dt],
               userid: userId
            });
         }
      }
   }

   // console.table(arrLock); // TIMES

   createTable(activeInactiveDataJoin);
   createGraph(activeInactiveDataJoin);
   getTableReportData(arrLock, result);

   //console.table(activeInactiveDataJoin);

   let hr = JSON.parse(await getHumanResourceAll());

   insertHR(hr, result);

   let activeInactiveData = alasql(`
      SELECT SUBSTRING(date, 1, 10) [date], SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs,
         ${timeIntervalFormat} AS [timeInterval]
      FROM ? 
      GROUP BY SUBSTRING(date, 1, 10), ${timeIntervalFormat}
      ORDER BY [date], [timeInterval]
   `, [arrLock])

   activeInactiveData.forEach(item => {
      item.activeTime = msToTime(item.activeMs);
      item.inactiveTime = msToTime(item.inactiveMs);
   });

   if (arrLock.length > 0) {
      labelData.avgHours = msToTime(alasql(`SELECT AVG(activeMs) [avgHours] FROM ?`, [activeInactiveData])[0].avgHours);
      labelData.mostActive = alasql(`SELECT MAX(activeMs), userid FROM ? GROUP BY userid`, [activeInactiveDataJoin])[0].userid;
      labelData.leastActive = alasql(`SELECT MIN(activeMs), userid FROM ? GROUP BY userid`, [activeInactiveDataJoin])[0].userid;
   }

   let lableGraphHtml = `
      <p><b>Total Number of Employees: </b>${labelData.totalEmployes + 1}</p>
      <p><b>Average Hours: </b>${labelData.avgHours}</p>
      <p><b>Most Active: </b>${labelData.mostActive == "" ? "" : labelData.mostActive.toUpperCase()}</p>
      <p><b>Least Active: </b>${labelData.leastActive == "" ? "" : labelData.leastActive.toUpperCase()}</p>
   `;
   $("#label-graph-info").html(lableGraphHtml);
}

function getTableReportData(data, result) {
   let hoursObj = [];
   let hoursFinal = [];
   let usersData = alasql(`
      SELECT DISTINCT(UPPER(userid)) userid
      FROM ?
      GROUP BY userid
      ORDER BY userid
   `, [result]);

   for (let i = 0; i < data.length; i++) {
      data[i].hour = parseInt(data[i].date.substring(11, 13));
      data[i].date = data[i].date.substring(0, 10);
   }

   let dates = alasql(`
      SELECT DISTINCT date
      FROM ?
   `, [data]);

   dates.forEach(date => {
      usersData.forEach(user => {
         hoursObj.push({
            userid: user.userid.trim().toUpperCase(),
            '_0': 0,
            '_1': 0,
            '_2': 0,
            '_3': 0,
            '_4': 0,
            '_5': 0,
            '_6': 0,
            '_7': 0,
            '_8': 0,
            '_9': 0,
            '_10': 0,
            '_11': 0,
            '_12': 0,
            '_13': 0,
            '_14': 0,
            '_15': 0,
            '_16': 0,
            '_17': 0,
            '_18': 0,
            '_19': 0,
            '_20': 0,
            '_21': 0,
            '_22': 0,
            '_23': 0,
            'totalHours': '00:00:00'
         });
      });

      let hoursDate = alasql(`
         SELECT userid, weekday, weeknumber, hour, date
         FROM ?
         WHERE date = '${ date.date }' AND activeStatus = 1
         GROUP BY userid, weekday, weeknumber, hour, date
         ORDER BY date, hour
      `, [data]);

      // console.table(hoursDate);

      hoursDate.forEach(element => {
         let indx = hoursObj.findIndex(x => x.userid == element.userid);
         Object.getOwnPropertyNames(hoursObj[indx]).forEach(function (val, idx, array) {
            if (val === "_" + element.hour) {
               hoursObj[indx][val] = 1;
            }
         });
      });

      hoursFinal.push({
          date: date,
          hoursArr: hoursObj
      });

      hoursObj = [];
   });

   let totalData = alasql(`
      SELECT userid, weeknumber, date, SUM(activeTime) [activeTime]
      FROM ? GROUP BY userid, weeknumber, date
   `, [data]);

   totalData.forEach(item => {
      hoursFinal.find(x => x.date.date == item.date)
         .hoursArr.find(y => y.userid == item.userid).totalHours = msToTime(item.activeTime);
   });

   createWeekTable(hoursFinal);
}

function createWeekTable(data) {
   $("#table_hours_user").html('');
   let htmlString = "";

   for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (htmlString == "") {
         htmlString = `
            <h4 class="float-left">Date: ${item.date.date} </h4>                     
            <table class="table table-bordered">
               <thead>
                  <tr>
                     <th>User Id</th>
                     <th>0</th>
                     <th>1</th>
                     <th>2</th>
                     <th>3</th>
                     <th>4</th>
                     <th>5</th>
                     <th>6</th>
                     <th>7</th>
                     <th>8</th>
                     <th>9</th>
                     <th>10</th>
                     <th>11</th>
                     <th>12</th>
                     <th>13</th>
                     <th>14</th>
                     <th>15</th>
                     <th>16</th>
                     <th>17</th>
                     <th>18</th>
                     <th>19</th>
                     <th>20</th>
                     <th>21</th>
                     <th>22</th>
                     <th>23</th>
                     <th>Total Hours</th>
                  </tr>
               </thead>
               <tbody>`;
      }

      item.hoursArr.forEach(itemHour => {
         htmlString += `
            <tr>
               <td>${ itemHour.userid }</td>
               <th class="${ itemHour._0 == 1 ? 'hour-color' : '' }"></th>
               <td class="${ itemHour._1 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._2 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._3 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._4 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._5 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._6 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._7 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._8 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._9 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._10 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._11 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._12 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._13 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._14 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._15 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._16 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._17 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._18 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._19 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._20 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._21 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._22 == 1 ? 'hour-color' : '' }"></td>
               <td class="${ itemHour._23 == 1 ? 'hour-color' : '' }"></td>
               <td>${ itemHour.totalHours }</td>
            </tr>`;
      });

      htmlString += `</tbody></table>`
      $("#table_hours_user").append(htmlString);

      htmlString = "";
   }
}

function createTable(data) {
   let dateRange = document.getElementById("inptDateRange").value;
   $(".productivity-table tbody").empty();

   $("#table_hours").html('');
   let htmlString = "";

   for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let colorClass = item.activeStatus == 1 ? 'green' : item.activeStatus == 0 ? 'yellow' : 'red';

      if (htmlString == "") {
         htmlString = `
            <h4 class="float-left">Department: ${data[i].department} </h4>                     
            <table class="table productivity-table">
               <thead>
                  <tr>
                     <th>Name</th>
                     <th></th>
                     <th>Version</th>
                     <th>Total Hours</th>
                     <!-- <th>Timeline</th> -->
                  </tr>
               </thead>
               <tbody>`;
      }

      if ((data[i + 1] !== undefined && data[i + 1].department !== data[i].department)) {
         htmlString += `</tbody></table>`
         $("#table_hours").append(htmlString);

         htmlString = "";
      }
      else {
         htmlString += `
            <tr>
               <td class="image">
                  <img src="${item.anchorGPS.length < 10 ? 'img/Circle-icons-profile.svg' : item.anchorGPS}" alt="user-profile" class="grid-img" />
               </td>
               <td style="width: 40%;" class="font-weight-bold">${item.userid}</td>
               <td style="width: 25%;"class='${colorClass}'>${item.version}</td>
               <td class="${item.activeMs > 0 ? 'font-weight-bold' : ''}">
                  <i class="fa fa-clock-o" aria-hidden="true"></i>
                  ${item.activeTime}
               </td>
            </tr>`;

         if (i == data.length - 1) {
            htmlString += `</tbody></table>`
            $("#table_hours").append(htmlString);

            htmlString = "";
         }
      }
   }
}

function createGraph(graphData) {
   const data = {
      labels: getGraphLabels(graphData),
      datasets: [
         {
            label: "At Desk",
            backgroundColor: "rgba(26,179,148,0.5)",
            borderColor: "rgba(26,179,148,0.7)",
            pointBackgroundColor: "rgba(26,179,148,1)",
            pointBorderColor: "#fff",
            data: getGraphUnlockValues(graphData),
            stack: "Stack 1",
         }
      ]
   };

   const config = {
      type: 'bar',
      data: data,
      options: {
         indexAxis: 'y',
         scales: {
            x: {
               ticks: {
                  callback: function (label, index, labels) {
                     return '';
                  }
               }
            },
         },
         plugins: {
            tooltip: {
               callbacks: {
                  label: function (tooltipItem) {
                     return msToTime(tooltipItem.raw);
                  }
               }
            }
         }
      },
   };

   if (chart !== null)
      chart.destroy();

   chart = new Chart(
      document.getElementById('barChart'),
      config
   );
}

function getGraphLabels(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.userid);
   });
   return result;
}

function getGraphLockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.inactiveMs);
   });
   return result;
}

function getGraphUnlockValues(data) {
   let result = [];
   data.forEach(item => {
      result.push(item.activeMs);
   });
   return result;
}

function formatDate(utcDate) {
   let d = new Date(utcDate);
   let month =
      (d.getMonth() + 1).toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
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

   return pad(hrs) + ':' + pad(mins) + ':00'
}

function msToTimeHr(s) {
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

   return pad(hrs) + ':00' + ':00'
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
   if (parseInt(range) == 1) {
      return ",SUBSTRING(utc, 1, 13) [timeInterval]";
   }
   else {
      return ",SUBSTRING(utc, 1, 10) [timeInterval]";
   }
}

function getWeekDay(day) {
   switch (day) {
      case 1:
         return 'Monday';
      case 2:
         return 'Tuesday';
      case 3:
         return 'Wednesday';
      case 4:
         return 'Thursday';
      case 5:
         return 'Friday';
      case 6:
         return 'Saturday';
      case 7:
         return 'Sunday';
   }
}

async function getAllDocs() {
   let finalArr = null;
   let result = null;
   let docLen = 0;
   let offset = 0;

   do {
      result = await getDocs(offset);

      docLen += result.actions.length;
      if (docLen > 0) {
         finalArr = offset == 0 ? result.actions : finalArr.concat(result.actions);
         docLen += 1;
         offset = docLen;
      }

   } while (result.actions.length > 0);

   return (finalArr);
}

async function getDocs(offset) {
   let result = null;

   await getDocsOffset(offset).then((res) => {
      result = JSON.parse(res);
   });

   return result;
}

function insertHR(hr, res) {
   let usersFilter = alasql(`
      SELECT r.userid,
      CASE
         WHEN LEN(hr.userId) >= 0 THEN hr.userId
         ELSE 'NULL'
      END [hrUserId],
      r.customerid, r.version as role
      FROM ? r
      LEFT JOIN ? hr 
      ON r.userid = hr.userId OR UPPER(r.userid) = UPPER(hr.userId)
      GROUP BY r.userid,CASE WHEN LEN(hr.userId) >= 0 THEN hr.userId ELSE 'NULL' END, r.customerid, r.version
   `, [res, hr]);

   let insertUsers = alasql(`
      SELECT UPPER(userid) [userid], hrUserId, customerid, MAX(role) [role]
      FROM ? 
      WHERE hrUserId = 'NULL' AND userid <> 'undefined'
      GROUP BY UPPER(userid), hrUserId, customerid
   `, [usersFilter]);
	
   // console.table(insertUsers);
   insertUsers.forEach(item => {
      saveHrUser(item);
   });
}

// $("#slctUserId").on('change', async function () {
//    document.getElementById("loader").classList.add("show-loader");
//    document.getElementById("loader").classList.remove("hide-loader");
//    let userid = this.value;

//    let res = JSON.parse(await getMessage());
//    let hr = JSON.parse(await getHumanResourceAll());

//    let usersData = alasql(`
//       SELECT UPPER(us.userid) [userid]
//       FROM ? us
//       INNER JOIN ? h ON us.userid = h.userId
//       WHERE 
//       GROUP BY UPPER(userid)
//       ORDER BY userid
//    `, [res, hr]);

//    let slctUsersHtml = `<option value="0">Select a user</option>`;

//    usersData.forEach(user => {
//       slctUsersHtml += `
//          <option value="${user.userid}">${user.userid.toUpperCase()}</option>
//       `;
//    });
//    slctUsersHtml += '</select>';

//    $("#slctUserId").html(slctUsersHtml);

//    document.getElementById("loader").classList.remove("show-loader");
//    document.getElementById("loader").classList.add("hide-loader");

//    $(".ms-selectall").trigger("click");
// });

function saveHrUser(item) {
   $.ajax({
      url: dataLakeUrl + "/employee/save",
      headers: {
         "Content-Type": "application/json",
      },
      type: "POST",
      data: JSON.stringify({
         anchorAddress: "-1",
         anchorGPS: "-1",
         customerId: item.customerid,
         department: "-1",
         firstName: "-1",
         key: webConfig.key,
         lastName: "-1",
         role: item.role,
         telephone: "-1",
         userId: item.userid,
      }),
      success: function (res) {
         console.log(res);
      },
      error: function (err) {
         console.log("Error:");
         console.log(err);
      },
   });
}