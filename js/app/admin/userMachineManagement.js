const dataLakeUrl = "https://dashboard.8thsensus.com:8080";
const key = "%$%$#5454354343trqt34rtrfwrgrfSFGFfgGSDFSFDSFDSFD";

let customerFilter = 'eve6512Sd2';

var dataTable = null;
var slctMachine = [];
var selectedUsers = [];
var sessionData = {
   customerId: "TestCustomer",
   department: "TestDepartment",
   userId: "LoggedTestUser"
};

toastr.options = {
   "closeButton": true,
   "progressBar": true,
   "timeOut": "2000",
   "extendedTimeOut": "1000"
}

function getUsers() {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
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
         let slctMachineStr = "";
         let slctUserId = document.getElementById("slctUserId").value;

         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");

         slctMachine.forEach(mach => slctMachineStr += `'${mach}',`);

         if (dataTable !== null)
            dataTable.destroy();
            assets = alasql(`
            SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, MAX(version) as version, MAX(customerid) as license,
            MAX(stamp) stamp
            FROM ?
            WHERE customerid = '${customerFilter}'
            `
         , [result]);
         let tableData = alasql(`
            SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, MAX(version) as version, MAX(customerid) as license,
            MAX(stamp) stamp
            FROM ?
            WHERE machinename IN (${slctMachineStr}'')
            AND customerid = '${customerFilter}'
            ${slctUserId !== "" ? "AND userid = '" + slctUserId + "'" : ""} GROUP BY UPPER(userid)`, [result]);

         dataTable = $('#example').DataTable({
            data: tableData,
            columns: [
               { data: "userid" },
               { data: "assets" }, // Number of assets
               { data: "version" },
               { data: "license" },
               { data: null },
               { data: null },
               { data: null }
            ],
            order: [[0, "asc"]],
            rowCallback: function (row, data, index) {
               let userMachines = alasql(`SELECT DISTINCT machinename FROM ? WHERE UPPER(userid) = '${data.userid}'`, [result])
               let machinesHtml = '';

               userMachines.forEach(item => {
                  machinesHtml += `<a class="d-block" href="../users.html?usrid=${data.userid}">${item.machinename}</a>`;
               });

               $(row).find('td:eq(1)').html(machinesHtml);
               $(row).find('td:eq(4)').html(`<a href="../logs.html?usrid=${data.userid}">See Logs</a>`);
               $(row).find('td:eq(5)').html(formatDate(data.stamp));
               $(row).find('td:eq(6)').html(`
                        <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#lockWarn" onClick='getUserData(${JSON.stringify(data)})'>
                           <i class="fa fa-lock"></i> Lock
                        </button>
                        <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#deleteWarn" onClick='getUserData(${JSON.stringify(data)})'>
                           <i class="fa fa-trash"></i> Delete 
                        </button>`
               );
            },
            select: true,
            pageLength: 25,
            responsive: true,
            dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
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

         dataTable.column(1).data().unique();
         $("#example tr").css('cursor', 'hand');
      },
      error: function (request, status, error) {
         console.error(error);
      }
   });
}

$.ajax({
   url: dataLakeUrl + '/message',
   headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
   },
   type: "GET",
   dataType: "json",
   data: {
   },
   success: function (result) {
      document.getElementById("loader").classList.remove("show-loader");
      document.getElementById("loader").classList.add("hide-loader");

      let machinesData = alasql(`
            SELECT machinename
            FROM ?
            WHERE customerid = '${customerFilter}'
            GROUP BY machinename
         `, [result]);

      let usersData = alasql(`
            SELECT UPPER(userid) [userid]
            FROM ?
            WHERE customerid = '${customerFilter}'
            GROUP BY UPPER(userid)
            ORDER BY userid
         `, [result]);

      let slctUsersHtml = `<option value=""></option>`;

      let slctMachineHtml = `<label for="slctMachine">Machine Name:</label>
            <select name="slctMachine[]" multiple id="slctMachine">`;

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
      $("#slctMachineContainer").html(slctMachineHtml);
      $('#slctMachine').multiselect({
         columns: 1,
         placeholder: 'Select Machines',
         selectAll: true
      });
      $(".ms-selectall").trigger("click");
      assets = alasql(`
            SELECT UPPER(userid) as userid, COUNT(DISTINCT machinename) as assets, MAX(version) as version, MAX(customerid) as license,
            MAX(stamp) stamp
            FROM ?
            WHERE customerid = '${customerFilter}'
            GROUP BY UPPER(userid)`
         , [result]);

      var matrix = result.length;
      if (dataTable !== null)
         dataTable.destroy();

      dataTable = $('#example').DataTable({
         data: assets,
         columns: [
            { data: "userid" },
            { data: "assets" }, // Number of assets
            { data: "version" },
            { data: "license" },
            { data: null },
            { data: null },
            { data: null }
         ],
         order: [[0, "asc"]],
         rowCallback: function (row, data, index) {
            let userMachines = alasql(`SELECT DISTINCT machinename FROM ? WHERE UPPER(userid) = '${data.userid}'`, [result])
            let machinesHtml = '';

            userMachines.forEach(item => {
               machinesHtml += `<a class="d-block" href="../users.html?usrid=${data.userid}">${item.machinename}</a>`;
            });

            $(row).find('td:eq(1)').html(machinesHtml);
            $(row).find('td:eq(4)').html(`<a href="../logs.html?usrid=${data.userid}">See Logs</a>`);
            $(row).find('td:eq(5)').html(formatDate(data.stamp));
            $(row).find('td:eq(6)').html(`
                  <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#lockWarn" onClick='getUserData(${JSON.stringify(data)})'>
                     <i class="fa fa-lock"></i> Lock
                  </button>
                  <button class="btn btn-outline-primary d-inline" data-toggle="modal" data-target="#deleteWarn" onClick='getUserData(${JSON.stringify(data)})'>
                     <i class="fa fa-trash"></i> Delete 
                  </button>`
            );
         },
         select: true,
         pageLength: 25,
         responsive: true,
         dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
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

      dataTable.column(1).data().unique();
      $("#example tr").css('cursor', 'hand');
   },
   error: function () {
      console.log("error");
   }
});

function getUserData(data) {
   //console.log(data);
}

function saveAction(action) {
   $('#lockWarn').modal('hide');
   $('#deleteWarn').modal('hide');
   toastr.success('User saved successfully', 'Success');
   // $.ajax({
   //    url: dataLakeUrl + "/actions/save",
   //    headers: {
   //       "Content-Type": "application/json",
   //    },
   //    type: "POST",
   //    data: JSON.stringify({
   //       "accessId": "string",
   //       "actionType": action,
   //       "customerId": sessionData.customerId,
   //       "key": key,
   //       "machineName": "string",
   //       "userId": sessionData.userId,
   //       "verified": "string"
   //    }),
   //    success: function (result) {
   //       toastr.success('User saved successfully', 'Success');
   //       saveLog(userRequest);
   //       $('#lockWarn').modal('hide');
   //       $('#deleteWarn').modal('hide');
   //    },
   //    error: function (err) {
   //       console.log("Error:");
   //       console.log(err);
   //    },
   // });
}

function saveLog(userRequest) {
   let request = {
      accessId: "string",
      customerId: sessionData.customerId,
      eventType: "User Creation",
      key: key,
      logEntry: `User: ${userRequest.userId} created`,
      userId: sessionData.userId,
   };

   $.ajax({
      url: dataLakeUrl + "/log/save",
      headers: {
         "Content-Type": "application/json",
      },
      type: "POST",
      data: JSON.stringify(request),
      success: function (result) {
         console.log(result);
      },
      error: function () {
         console.log("error");
      },
   });
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

$("#slctUserId").on('change', function () {
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
   let userid = this.value;
   $.ajax({
      url: dataLakeUrl + '/message',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
      },
      type: "GET",
      dataType: "json",
      contentType: 'application/json',
      data: {
      },
      success: function (result) {
         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");

         let machinesData = alasql(`
            SELECT machinename
            FROM ?
            WHERE UPPER(userid) = '${userid}'
            AND customerid = '${customerFilter}'
            GROUP BY machinename
         `, [result]);

         let slctMachineHtml = `<label for="slctMachine">Machine Name:</label>
            <select name="slctMachine[]" multiple id="slctMachine">`;

         machinesData.forEach(machine => {
            slctMachineHtml += `<option value="${machine.machinename}">${machine.machinename}</option>`;
         });

         $("#slctMachineContainer").html(slctMachineHtml);
         $('#slctMachine').multiselect({
            columns: 1,
            placeholder: 'Select Machines',
            selectAll: true
         });

         $(".ms-selectall").trigger("click");
      },
      error: function (request, status, error) {
         console.error(error);
      }
   });
});