const dataLakeUrl = webConfig.dataLakeUrl;
const key = webConfig.key;

var dataTable = null;
var sessionData = {
   customerId: webConfig.customerFilter,
   userId: "LoggedTestUser"
};

getSecurityLogs();

function getSecurityLogs() {
   $.ajax({
      url: dataLakeUrl + "/log/all",
      headers: {
         "Content-Type": "application/x-www-form-urlencoded",
      },
      type: "GET",
      dataType: "json",
      data: {},
      success: function (result) {
         document.getElementById("loader").classList.remove("show-loader");
         document.getElementById("loader").classList.add("hide-loader");

         let logsData = alasql(`
               SELECT accessId, customerId, eventType, logEntry, userId, utc
               FROM ?
               WHERE customerId = '${ webConfig.customerFilter }'
               ORDER BY utc DESC
            `, [result]);

         generateTable(logsData);
      },
      error: function () {
         console.log("error");
      },
   });
}

function generateTable(data) {
   if (dataTable !== null)
      dataTable.destroy();

   dataTable = $("#example").DataTable({
      data: data,
      columns: [
         { data: "accessId" },
         { data: "customerId" },
         { data: "eventType" },
         { data: "logEntry" },
         { data: "userId" },
         { data: "utc" }
      ],
      order: [[0, "asc"]],
      rowCallback: function (row, data, index) {
         $(row).find('td:eq(5)').html(formatDate(data['utc']));
      },
      select: true,
      pageLength: 25,
      responsive: true,
      dom: 'rt<"bottom"p><"html5buttons"B><"clear">',
      buttons: [
         { extend: "copy" },
         { extend: "csv" },
         { extend: "excel", title: "ExampleFile" },
         { extend: "pdf", title: "ExampleFile" },

         {
            extend: "print",
            customize: function (win) {
               $(win.document.body).addClass("white-bg");
               $(win.document.body).css("font-size", "10px");

               $(win.document.body)
                  .find("table")
                  .addClass("compact")
                  .css("font-size", "inherit");
            },
         },
      ],
   });

   dataTable.column(1).data().unique();
   $("#example tr").css("cursor", "hand");
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