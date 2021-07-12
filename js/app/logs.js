   let dataSet = null;
   var dataTable = null;

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
         let machinesData = alasql(`
            SELECT machinename
            FROM ?
            GROUP BY machinename
         `, [result]);

         let usersData = alasql(`
            SELECT UPPER(userid) [userid]
            FROM ?
            GROUP BY UPPER(userid)
            ORDER BY userid
         `, [result]);

         let slctMachineHtml = `<option value=""></option>`;
         let slctUsersHtml = `<option value=""></option>`;

         machinesData.forEach(machine => {
            slctMachineHtml += `
               <option value="${ machine.machinename }">${ machine.machinename }</option>
            `;
         });

         usersData.forEach(user => {
            slctUsersHtml += `
               <option value="${ user.userid }">${ user.userid }</option>
            `;
         });

         $("#slctUserId").html(slctUsersHtml);
         $("#slctMachine").html(slctMachineHtml);
      },
      error: function (request, status, error) {
         console.error(error);
      }
   });

   getLogs();

   function getLogs() {
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
            var matrix = result.length;
            let dateFrom = document.getElementById("dateFrom").value;
            let dateTo = document.getElementById("dateTo").value;
            let slctEvents = document.getElementById("slctEvents").value;
            let slctUserId = document.getElementById("slctUserId").value;
            let slctMachine = document.getElementById("slctMachine").value;

            Date.prototype.addDays = function(days) {
               var date = new Date(this.valueOf());
               date.setDate(date.getDate() + days);
               return date;
            }

            if (dateFrom == "" && dateTo == "") {
               document.getElementById("dateFrom").valueAsDate = new Date().addDays(-1);
               document.getElementById("dateTo").valueAsDate = new Date();
               dateFrom = document.getElementById("dateFrom").value;
               dateTo = document.getElementById("dateTo").value;
            }

            let inEventsString = "";
            if (slctEvents !== "") {
               inEventsString = slctEvents == "Locked" ? 
                  "AND diagcode IN ('D0003','D0004','D0005','D0007','D0009','D0012','D0015')":
                  "AND diagcode IN ('D0002','D0006','D0008','D0010','D0011','D0013','D0014','D0001')";
            }
            
            let tableData = alasql(`
               SELECT *
               FROM ?
               WHERE utc >= '${ dateFrom }' AND utc <='${ dateTo }' 
               ${ inEventsString }
               ${ slctUserId !== "" ? " AND userid = '" + slctUserId + "'" : "" }
               ${ slctMachine !== "" ? " AND machinename = '" + slctMachine + "'" : "" }
            `, [result]);
                       
            if(dataTable !== null)
               dataTable.destroy();

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
                  { data: "stamp" },
                  { data: "diagcode" },
                  { data: "key" }
               ],
               columnDefs: [
                  {
                     "targets": [8],
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
                  $(row).find('td:eq(0)').html(`<a style="color: #000000;" href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
                  $(row).find('td:eq(1)').html(`<a style="color: #000000;" href="machines.html?mchname=${data['machinename']}">${data['machinename']}</a>`);
                  $(row).find('td:eq(6)').html(formatDate(data['stamp']));
                  $(row).find('td:eq(7)').html(getCode(data['diagcode']));
               },
               select: true,
               pageLength: 10,
               responsive: true,
               dom: '<"top"i>rt<"bottom"flp><"html5buttons"B><"clear">',
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
         },
         error: function (request, status, error) {
            console.error(error);
         }
      })      
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
         month +
         "-" +
         day +
         "-" +
         d.getFullYear() +
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
