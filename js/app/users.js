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
      let machines = alasql(`
         SELECT machinename
         FROM ? 
         WHERE userid = '${ usrid }'
         GROUP BY machinename
      `, [result]);

      tableString += `<tr><td class='user-machines'><b>Machines Names: </b><br/><br />`;

      machines.forEach(machine => {
         console.log(machine);
         tableString += `
            <a href='machines.html?mchname=${ machine.machinename }' 
               class="machine">
               <i class="fa fa-desktop"></i>
               <p>
                  ${ machine.machinename }
               </p>
            </a>
         `;
      });
      
      tableString += `</td></tr>`;

      $("#usr-table tbody").append(tableString);
   },
   error: function (xhr, status, error) {
      console.error(error);
   },
});