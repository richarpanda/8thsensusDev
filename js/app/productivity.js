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
      let usersData = alasql(`
         SELECT userid
         FROM ?
         GROUP BY userid
      `, [result]);

      let slctUsersHtml = `<option value=""></option>`;

      usersData.forEach(user => {
         slctUsersHtml += `
            <option value="${ user.userid }">${ user.userid }</option>
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
      type: "GET" /* or type:"GET" or type:"PUT" */,
      dataType: "json",
      data: {},
      success: function (result) {
         let dateFrom = document.getElementById("dateFrom").value;
         let dateTo = document.getElementById("dateTo").value;
         let slctUserId = document.getElementById("slctUserId").value;

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

         let arrLock = [];
         let userData = alasql(`
            SELECT
               CASE 
                  WHEN diagcode IN ('D0003','D0004','D0005','D0007','D0009','D0012','D0015') THEN 'Locked'
                  WHEN diagcode IN ('D0002','D0006','D0008','D0010','D0011','D0013','D0014','D0001') THEN 'Unlocked'
               END [lockStatus]
               ,userid
               ,SUBSTRING(stamp, 1, 16) date
            FROM ? 
            WHERE utc >= '${ dateFrom }' AND utc <='${ dateTo }' 
            ${ slctUserId !== "" ? " AND userid = '" + slctUserId + "'" : "" }
            ORDER BY userid, stamp
         `, [result]);
         
         userData.forEach(function(d,idx){d.rownum = idx});

         for (let i = 0; i < userData.length; i++) {
            let actualData = userData[i];

            if (i != userData.length - 1) {
               let nextData = userData[i + 1];   
               if (actualData.lockStatus != nextData.lockStatus) {
                  arrLock.push(actualData);
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
                  if (actualData.lockStatus == "Unlocked") { // ACTIVE TIME
                     arrLock[i].activeTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
                     arrLock[i].inactiveTime = 0;
                  }
                  else { // INACTIVE TIME
                     arrLock[i].activeTime = 0
                     arrLock[i].inactiveTime = Math.abs(new Date(nextData.date) - new Date(actualData.date));
                  }
               }
            }
         }

         // console.table(arrLock);

         let activeInactiveData = alasql(`
            SELECT userid, SUBSTRING(date, 1, 10) [date], SUM(activeTime) activeTime, SUM(inactiveTime) inactiveTime
            FROM ? 
            GROUP BY userid, SUBSTRING(date, 1, 10)
         `, [arrLock])

         activeInactiveData.forEach(item => {
            item.ActiveHours = msToTime(item.activeTime);
            item.InactiveHours = msToTime(item.inactiveTime);
         })

         console.table(activeInactiveData);

         if(dataTable !== null)
            dataTable.destroy();

         dataTable = $('#example').DataTable({
            data: activeInactiveData,
            destroy: true,
            columns: [
               { data: "userid" },
               { data: "date" },
               { data: "ActiveHours" },
               { data: "InactiveHours" },
               { data: "activeTime" },
            ],
            columnDefs: [
               {
                  "targets": [4],
                  "visible": false,
                  "searchable": false
               }
            ],
            order: [[1, "desc"]],
            // rowCallback: function (row, data, index) {
            //    if ("data['key'] != 'valid key'") {
            //       $(row).find('td:eq(0)').css('color', 'red');
            //    }
            // },
            // rowCallback: function (row, data, index) {
            //    $(row).find('td:eq(0)').html(`<a style="color: #000000;" href="users.html?usrid=${data['userid']}">${data['userid']}</a>`);
            //    $(row).find('td:eq(1)').html(`<a style="color: #000000;" href="machines.html?mchname=${data['machinename']}">${data['machinename']}</a>`);
            //    $(row).find('td:eq(6)').html(formatDate(data['stamp']));
            //    $(row).find('td:eq(7)').html(getCode(data['diagcode']));
            // },
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

      },
      error: function (err) {
         console.error(err);
      }
   });
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
 
   return pad(hrs) + ':' + pad(mins) + ':' + pad(secs) + '.' + pad(ms, 3);
 }
