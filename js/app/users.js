let tAccountLicenses;

/*********************************************************/

let dataSet = null;


$.ajax({
   url: "https://dashboard.8thsensus.com:8080/message",
   headers: {
      "Content-Type": "application/x-www-form-urlencoded",
   },
   type: "GET" /* or type:"GET" or type:"PUT" */,
   dataType: "json",
   data: {},
   success: function (result) {
      const querystring = window.location.search;
      const params = new URLSearchParams(querystring);
      const usrid = params.get('usrid');

      $("#userName").html(`<b>User</b>: ${ usrid }`);

      let tableString = "";
      let data = alasql(`
         SELECT customerid, machinename, devicelist, os, hardware, localip
         FROM ?
         WHERE userid = '${ usrid }'
         GROUP BY customerid, machinename, devicelist, os, hardware, localip
         `, [result]);

      tableString += `
         <tr>
            <td><b>Customer Id: </b> ${ data[0].customerid }</td>
         </tr>
         <tr>
            <td>
               <b>Machine Name: </b> 
               <a href='machines.html?mchname=${ data[0].machinename }'>
                  ${ data[0].machinename }
               </a>
            </td>
         </tr>
         <tr>
            <td><b>Device List: </b> ${ data[0].devicelist }</td>
         </tr>
         <tr>
            <td><b>OS: </b> ${ data[0].os }</td>
         </tr>
         <tr>
            <td><b>Hardware: </b> ${ data[0].hardware }</td>
         </tr>
         <tr>
            <td><b>Local IP: </b> ${ data[0].localip }</td>
         </tr>
      `;

      $("#usr-table tbody").append(tableString);
   },
   error: function (xhr, status, error) {
      console.error(error);
   },
});