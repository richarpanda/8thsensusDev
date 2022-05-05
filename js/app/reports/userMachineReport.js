init();
async function init() {
   let res = JSON.parse(await getMessage());
   let resa = JSON.parse(await getActionsAll());
   
   let result = alasql(`
      SELECT 
         CASE 
            WHEN NOT LEN(a.userId) >= 0 THEN r.userid
            ELSE a.userId
         END [userid],
         r.id,r.key, r.customerid, r.mac,r.remoteip,r.diagcode,r.version,r.machinename,r.devicelist,r.confidence,r.type,r.os,r.hardware,r.applications,r.perfcounters,r.localip,r.gps,r.utc,r.stamp, r.version
      FROM ? r
      LEFT JOIN ? a 
      ON r.machinename IN a.machineName
      WHERE customerid = '${ webConfig.customerFilter }'
   `, [res, resa]);

   document.getElementById("loader").classList.remove("show-loader");
   document.getElementById("loader").classList.add("hide-loader");

   let data = alasql(`SELECT userid, machinename, devicelist, os, hardware, version FROM ?
      GROUP BY userid, machinename, devicelist, os, hardware, version
      ORDER BY userid`, [result]);

   var table = $('#example').DataTable({
      data: data,
      columns: [
         { data: "userid" },
         { data: "machinename" },
         { data: "devicelist" },
         { data: "os" },
         { data: "hardware" },
         { data: "version" }
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
