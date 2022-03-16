const dataLakeUrl = webConfig.dataLakeUrl;
const key = webConfig.key;
let customerFilter = webConfig.customerFilter;

$.ajax({
   url: dataLakeUrl + '/message',
   headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
   },
   type: "GET",
   dataType: "json",
   data: {
   },
   success: function (res) {
      $.ajax({
         url: dataLakeUrl + "/actions/all",
         headers: {
            "Content-Type": "application/x-www-form-urlencoded",
         },
         type: "GET",
         dataType: "json",
         data: {},
         success: function (resa) {
            let result = alasql(`
               SELECT 
                  CASE 
                     WHEN NOT LEN(a.userId) >= 0 THEN r.userid
                     ELSE a.userId
                  END [userid],
                  r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp
               FROM ? r
               LEFT JOIN ? a 
               ON r.machinename IN a.machineName
            `, [res, resa]);

            document.getElementById("loader").classList.remove("show-loader");
            document.getElementById("loader").classList.add("hide-loader");

            let data = alasql(`SELECT userid, machinename, devicelist, os, hardware FROM ?
               GROUP BY userid, machinename, devicelist, os, hardware
               ORDER BY userid`, [result]);

            var table = $('#example').DataTable({
               data: data,
               columns: [
                  { data: "userid" },
                  { data: "machinename" },
                  { data: "devicelist" },
                  { data: "os" },
                  { data: "hardware" }
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
         error: function (err) {
            console.log("Error:");
            console.log(err);
         },
      });      
   },
   error: function () {
      console.log("error");
   }
});