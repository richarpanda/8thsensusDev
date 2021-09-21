let dataSet = null;
var slctMachine = [];

$.ajax({
   url: 'https://dashboard.8thsensus.com:8080/message',
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

      let apps = [];
      let data = alasql(`
         SELECT customerid, applications
         FROM ?
         GROUP BY customerid, applications
         ORDER BY stamp DESC
      `, [result]);

      data.forEach(element => {
         element.applications = element.applications.replace('{',' ');
         element.applications = element.applications.replace('}',' ');
   
         let elementApps = (element.applications.split('|')[0] + element.applications.split('|')[1]).split(',');
         elementApps.forEach(app => {
            if (apps[0] == undefined) {
               apps.push({
                  appName: app.trim()
               });
            }
            else {
               if (apps.find(x => x.appName == app.trim()) == undefined)
               {
                  apps.push({
                     appName: app.trim()
                  });
               }
            }
         });
      });

      var appssql = alasql(`SELECT * FROM ? ORDER BY appName`, [apps]);
      // console.table(appssql);

      var table = $('#example').DataTable({
         data: appssql,
         columns: [
            { data: "appName" }
         ],
         order: [[0, "asc"]],
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

      table.column(1).data().unique();
      $("#example tr").css('cursor', 'hand');
   },
   error: function () {
      console.log("error");
   }
});

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

$("#slctUserId").on('change', function(){
   document.getElementById("loader").classList.add("show-loader");
   document.getElementById("loader").classList.remove("hide-loader");
   let userid = this.value;
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
         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");
         
         let machinesData = alasql(`
            SELECT machinename
            FROM ?
            WHERE UPPER(userid) = '${userid}'
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