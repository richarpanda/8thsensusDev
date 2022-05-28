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

   //console.table(userData);

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
      SELECT userid, version, department, anchorGPS, '${dateRangeString.split('-')[0].trim()}' [from], '${dateRangeString.split('-')[1].trim()}' [to] ,SUM(activeTime) activeMs, SUM(inactiveTime) inactiveMs, MAX(rownum) rownum
      FROM ? 
      GROUP BY userid, version, department, anchorGPS
      ORDER BY userid
   `, [arrLock]);

   // console.table(activeInactiveDatabyUser);

   let activeInactiveDataJoin = alasql(`
      SELECT a.userid, a.version, a.department, a.anchorGPS, a.[from], a.[to], a.activeMs, a.inactiveMs, a.rownum, b.activeStatus
      FROM ? a
      INNER JOIN ? b
      ON a.rownum = b.rownum
      WHERE UPPER(a.department) IN (${slctDeps}'')
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

   //console.table(arrLock); // TIMES

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
   let week = [];
   let usersData = alasql(`
      SELECT DISTINCT(UPPER(userid)) userid
      FROM ?
      GROUP BY userid
      ORDER BY userid
   `, [result]);

   let weekNumber = alasql(`
      SELECT weeknumber
      FROM ? GROUP BY weeknumber
   `, [data]);

   weekNumber.forEach(weekElement => {
      usersData.forEach(user => {
         week.push({
            weeknumber: weekElement.weeknumber,
            userid: user.userid.trim().toUpperCase(),
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      });
   })

   let sundayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Sunday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let mondayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Monday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let tuesdayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Tuesday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let wednesdayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Wednesday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let thursdayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Thursday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let fridayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Friday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let saturdayData = alasql(`
      SELECT userid, weekday, weeknumber, SUM(activeTime) [activeTime]
      FROM ? WHERE weekday = 'Saturday' GROUP BY userid, weekday, weeknumber
   `, [data]);
   let totalData = alasql(`
      SELECT userid, weeknumber, SUM(activeTime) [activeTime]
      FROM ? GROUP BY userid, weeknumber
   `, [data])

   sundayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: msToTime(element.activeTime),
            total: "00:00:00"
         });
      }
      else {
         week[indx].sunday = msToTime(element.activeTime);
      }
   });

   mondayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: msToTime(element.activeTime),
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].monday = msToTime(element.activeTime);
      }
   });

   tuesdayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: msToTime(element.activeTime),
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].tuesday = msToTime(element.activeTime);
      }
   });

   wednesdayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));

      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: msToTime(element.activeTime),
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].wednesday = msToTime(element.activeTime);
      }
   });

   thursdayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: msToTime(element.activeTime),
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].thursday = msToTime(element.activeTime);
      }
   });

   fridayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: msToTime(element.activeTime),
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].friday = msToTime(element.activeTime);
      }
   });

   saturdayData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: msToTime(element.activeTime),
            sunday: "00:00:00",
            total: "00:00:00"
         });
      }
      else {
         week[indx].saturday = msToTime(element.activeTime);
      }
   });

   totalData.forEach(element => {
      let indx = week.findIndex((obj => obj.userid == element.userid && obj.weeknumber == element.weeknumber));
      if (indx == -1) {
         week.push({
            weeknumber: element.weeknumber,
            userid: element.userid,
            monday: "00:00:00",
            tuesday: "00:00:00",
            wednesday: "00:00:00",
            thursday: "00:00:00",
            friday: "00:00:00",
            saturday: "00:00:00",
            sunday: "00:00:00",
            total: msToTime(element.activeTime),
         });
      }
      else {
         week[indx].total = msToTime(element.activeTime);
      }
   });

   week.forEach(weekItem => {
      weekItem.weekFrom = moment().isoWeekYear(new Date().getFullYear()).isoWeek(weekItem.weeknumber - 1).startOf('week').format('YYYY-MM-DD')
      weekItem.weekTo = moment().isoWeekYear(new Date().getFullYear()).isoWeek(weekItem.weeknumber - 1).endOf('week').format('YYYY-MM-DD')
   })

   let weekdata = alasql(`SELECT userid, weeknumber, weekFrom, weekTo, sunday, monday, tuesday, wednesday, thursday, friday, saturday, total FROM ? ORDER BY weeknumber`, [week]);

   createWeekTable(weekdata)
}

function createWeekTable(data) {
   if (weekDataTable !== null)
      weekDataTable.destroy();

   weekDataTable = $('#weekDataTable').DataTable({
      data: data,
      columns: [
         { data: "userid" },
         { data: "weekFrom" },
         { data: "weekTo" },
         { data: "sunday" },
         { data: "monday" },
         { data: "tuesday" },
         { data: "wednesday" },
         { data: "thursday" },
         { data: "friday" },
         { data: "saturday" },
         { data: "total" }
      ],
      order: [1, 'asc'],
      rowCallback: function (row, data, index) {
         $(row).find('td:eq(0)').html(`<a href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
      },
      select: true,
      pageLength: 500,
      responsive: true,
      // dom: 'rt<"bottom"flp><"html5buttons"B><"clear">',
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      retrieve: true,
      searching: false,
      buttons: [
         { extend: 'copy' },
         { extend: 'csv' },
         { extend: 'excel', title: `Timesheet Report` },
         { extend: 'pdf', title: `Timesheet Report` },
         {
            extend: 'print',
            customize: function (win) {
               $(win.document.body).addClass('white-bg');
               $(win.document.body).css('font-size', '10px');

               $(win.document.body).find('table')
                  .addClass('compact')
                  .css('font-size', 'inherit');
            }
         }
      ]
   });
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
      console.log(item.anchorGPS);
      if ((data[i+1] !== undefined && data[i+1].department !== data[i].department)) {
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
               <td style="width: 40%;">${item.userid}</td>
               <td style="width: 25%;"class='${colorClass}'>${item.version}</td>
               <td><i class="fa fa-clock-o" aria-hidden="true"></i> ${item.activeTime}</td>
               <!--<td class="graph-container">
                  <div class="graph" style="width: 100%;">&nbsp;
                     ${!isNaN(item.activePer) ? '<div class="active" style="width: ' + item.activePer + '%;">&nbsp;</div>' : ''} 
                  </div>
               </td> -->
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
      ON r.userid = hr.userId
      GROUP BY r.userid,CASE WHEN LEN(hr.userId) >= 0 THEN hr.userId ELSE 'NULL' END, r.customerid, r.version
   `, [res, hr]);

   //console.table(usersFilter);

   let insertUsers = alasql(`
      SELECT *
      FROM ? 
      WHERE hrUserId = 'NULL' AND userid <> 'undefined'
   `, [usersFilter]);

   //console.table(insertUsers);
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