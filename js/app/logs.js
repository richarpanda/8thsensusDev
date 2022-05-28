let dataSet = null;
var dataTable = null;
var dateFrom = moment().add(-1, 'days').format('YYYY-MM-DDT00:00:00');
var dateTo = moment().format('YYYY-MM-DDT23:59:59');
var slctMachine = [];

var res = null;
var resa = null;

Date.prototype.addDays = function (days) {
   var date = new Date(this.valueOf());
   date.setDate(date.getDate() + days);
   return date;
}

document.getElementById("loader").classList.add("show-loader");

$(function () {
   $('input[name="daterange"]').daterangepicker({
      autoApply: true,
      opens: 'left',
      minDate: new Date().addDays(-30),
      maxDate: new Date(),
      startDate: new Date().addDays(-1),
      endDate: new Date(),
   }, function (start, end, label) {
      dateFrom = start.format('YYYY-MM-DDTHH:mm:ss');
      dateTo = end.format('YYYY-MM-DDTHH:mm:ss');
   });
});


init();
async function init() {
   
   res = null;
   resa = null;
   res = JSON.parse(await getMessage());
   resa = JSON.parse(await getActionsAll());

   await getData(0);
}

async function getData(iteration) {
   let resultMax = alasql(`SELECT MAX(id) [id], userid FROM ? GROUP BY userid`, [res])
   let resultA = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      INNER JOIN ? max
      ON r.id = max.id
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resultMax, resa]);
   
   let result = alasql(`
      SELECT userid, r.id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${ webConfig.customerFilter }'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let machinesData = alasql(`
      SELECT machinename
      FROM ?
      GROUP BY machinename
      ORDER BY machinename
   `, [result]);

   let usersData = alasql(`
      SELECT userid [userid]
      FROM ?
      GROUP BY userid
      ORDER BY userid
   `, [result]);

   let slctUsersHtml = `<option value=""></option>`;
   let slctMachineHtml = `<option value=""></option>`;

   machinesData.forEach(machine => {
      slctMachineHtml += `
         <option value="${machine.machinename}">${machine.machinename}</option>
      `;
   });

   usersData.forEach(user => {
      slctUsersHtml += `
         <option value="${user.userid}">${user.userid}</option>
      `;
   });

   $("#slctUserId").html(slctUsersHtml);
   $("#slctMachine").html(slctMachineHtml);
   $(".ms-selectall").trigger("click");

   await processData(result);

   if (iteration > 0 || result.length < 5000) {
      document.getElementById("mini-loader").classList.remove("show-loader");
      document.getElementById("mini-loader").classList.add("hide-loader");
   }
   
   if (iteration == 0 && result.length >= 5000) {
      resAll = await getAllDocs();
      res = res.concat(resAll);
      getData(1);
   }
}

async function getLogs() {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");

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
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resa]);

   // console.log('length: ' + res.length);

   let result = alasql(`
      SELECT userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${ webConfig.customerFilter }'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");
   processData(result);
}

function setCheckValue(val, checked) {
   if (checked) {
      slctMachine.push(val);
   }
   else {
      let index = slctMachine.indexOf(val);
      if (index > -1) {
         slctMachine.splice(index, 1);
      }
   }
}

async function processData(result) {
   var matrix = result.length;
   let slctEvents = document.getElementById("slctEvents").value;
   let slctUserId = document.getElementById("slctUserId").value;
   let slctMachineStr = document.getElementById("slctMachine").value;

   let inEventsString = "";
   if (slctEvents !== "") {
      if (slctEvents == "Locked")
         inEventsString = "AND diagcode IN ('D0003','D0004','D0005','D0007','D0009','D0012','D0015')";
      else if (slctEvents == "Unlocked")
         inEventsString = "AND diagcode IN ('D0002','D0006','D0008','D0010','D0011','D0013','D0014','D0001')";
   }

   let tableData = alasql(`
      SELECT userid, machinename, mac, remoteip, localip, gps, utc, version, diagcode,  key
      FROM ?
      WHERE utc >= '${dateFrom}' AND utc <='${dateTo}'
      ${inEventsString}
      ${slctUserId !== "" ? " AND userid = '" + slctUserId + "'" : ""}
      ${slctMachineStr !== "" ? " AND machinename = '" + slctMachineStr + "'" : ""}
   `, [result]);

   if (dataTable !== null)
      dataTable.destroy();

   // console.table(tableData);

   dataTable = $('#example').DataTable({
      data: tableData,
      destroy: true,
      columns: [
         { data: "userid" },
         { data: "machinename" },
         { data: "mac" },
         { data: "remoteip" },
         { data: "localip" },
         { data: "gps" },
         { data: "utc" },
         { data: "version" },
         { data: "diagcode" },
         { data: "key" }
      ],
      columnDefs: [
         {
            "targets": [9],
            "visible": false,
            "searchable": false
         }
      ],
      order: [[6, "desc"]],
      rowCallback: function (row, data, index) {
         if ("data['key'] != 'valid key'") {
            $(row).find('td:eq(0)').css('color', 'red');
         }
      },
      rowCallback: function (row, data, index) {
         $(row).find('td:eq(0)').html(`<a href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
         $(row).find('td:eq(6)').html(formatDate(data['utc']));
         $(row).find('td:eq(8)').html(getCode(data['diagcode']));
      },
      select: true,
      pageLength: 500,
      responsive: true,
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      //dom: '<"top"i>rt<"bottom"flp><"html5buttons"B><"clear">',
      retrieve: true,
      searching: false,
      buttons: [
         { extend: 'copy' },
         { extend: 'csv' },
         { extend: 'excel', title: 'ExampleFile' },
         { extend: 'pdf', title: 'ExampleFile' },
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

   $("#example tr").css('cursor', 'hand');
}

function formatDate(utcDate) {
   let d = new Date(utcDate);
   let month =
      (d.getMonth()+ 1).toString().length == 1 ? "0" + (d.getMonth() + 1) : (d.getMonth() + 1);
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

function getCode(code) {
   var codeDiscription = "";
   var codeJson = [{
      "D0001": "Screen Unlocked | Initial Login after reboot | Confidence 1:5,000,000",
      "D0002": "Screen Unlocked | Zero Touch Unlocked authorized user |  1:5,000,000",
      "D0003": "Screen Locked 0 | Zero Touch Locked no user present | Confidence 1:5,000,000",
      "D0004": "Screen Locked 2 | Manual Lock Initiated by authorized user |  1:5,000,000",
      "D0005": "Screen Locked 1| Lock without Camera | Confidence 1:5,000,000",
      "D0006": "Screen Unlocked | Authorized user certified | Confidence 1:25,000,000",
      "D0007": "Screen Locked 2 | Manual Lock Initiated by authorized user | Manual Process",
      "D0008": "Screen Unlocked | Unauthorized user(s) presented |  Confidence 1:5,000,000",
      "D0009": "Screen Locked 1 | Unauthorized user(s) presented  | Confidence 1:5,000,000",
      "D0010": "Screen Unlocked | Authorized user(s) presented | 1:5,000,000",
      "D0011": "Screen Unlocked | Unauthorized user(s) presented | Confidence 1:100,000",
      "D0012": "Screen Locked 3 | Power Savings Lock Initiated | System Process",
      "D0013": "Screen Unlocked | 8th Sensus EVE Stopped | Error",
      "D0014": "Screen Unlocked | Video Conference in progress| Confidence 1:5,000,000",
      "D0015": "Screen Locked 1 | Over the Shoulder unauthorized user(s) presented |  > 1"
   }];

   $.each(codeJson[0], function (key, value) {
      if (code == key) {
         codeDiscription = value;
      }
   });
   return codeDiscription
}

$("#slctUserId").on('change', async function(){
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
   let userid = this.value;

   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());

   let resultMax = alasql(`SELECT MAX(id) [id], userid FROM ? GROUP BY userid`, [res])
   let resultA = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
      FROM ? r
      INNER JOIN ? max
      ON r.id = max.id
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resultMax, resa]);
   
   let result = alasql(`
      SELECT userid, r.id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      FROM ? r
      WHERE customerid = '${ webConfig.customerFilter }'
      GROUP BY userid, id, key, customerid, mac, remoteip, diagcode, version, machinename, devicelist, confidence, type, os, hardware, applications, perfcounters, localip, gps, utc, stamp
      `, [resultA]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");
   
   let machinesData = alasql(`
      SELECT machinename
      FROM ?
      WHERE UPPER(userid) = '${userid}' OR UPPER(userid) = UPPER('${userid}')
      GROUP BY machinename
      ORDER BY machinename
   `, [result]);

   let slctMachineHtml = '';
   machinesData.forEach(machine => {
      slctMachineHtml += `<option value="${machine.machinename}">${machine.machinename}</option>`;
   });

   $("#slctMachine").html(slctMachineHtml);
   $(".ms-selectall").trigger("click");
            
});

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