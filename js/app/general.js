$(document).ready(function () {
   createMenu();
   
   function createMenu() {

      const path = window.location.pathname.substring(1);
      console.log(path);

      let navMenu = `
         <ul class="nav navbar-nav mr-auto">
            <li class="sub-menu ${ path == 'indexMain.html' ? 'active' : '' }">
               <a href='indexMain.html'>
                  <span>Home</span>
               </a>
            </li>

            <li class="sub-menu ${ path == 'productivity.html' ? 'active' : '' }">
               <a href='productivity.html'>
                  <span>Productivity</span>
               </a>
            </li>

            <li class="sub-menu ${ path == 'logs.html' ? 'active' : '' }">
               <a href='logs.html'>
                  <span>Logs</span>
               </a>
            </li>

            <li class='sub-menu'>
               <a href='#'>
                  <span>Reports</span>
                  <i class='fa fa-angle-down'></i>
               </a>
               <ul>
                  <li>
                     <a href='#'>
                        Application
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        User Machine
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        Access Logs
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        Gps Locations
                     </a>
                  </li>
               </ul>
            </li>

            <li class='sub-menu'>
               <a href='#'>
                  <span>Admin</span>
                  <i class='fa fa-angle-down'></i>
               </a>
               <ul>
                  <li>
                     <a href='#'>
                        User Access Management
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        Security Logs
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        User / Machine Management
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        Report Admin
                     </a>
                  </li>
                  <li>
                     <a href='#'>
                        Location Profiles MGMT
                     </a>
                  </li>
               </ul>
            </li>        
         </ul>
         <ul class="nav navbar-top-links navbar-right">
            <li>
               <a href="login.html">
                  <i class="fa fa-sign-out"></i> Log out
               </a>
            </li>
         </ul>`;

      $(".dinamyc-nav-menu").html(navMenu);
   }

   $(".sub-menu ul").hide();
   $(".sub-menu a").click(function () {
      $(this).parent(".sub-menu").children("ul").slideToggle("200");
      $(this).find("i.fa").toggleClass("fa-angle-up fa-angle-down");
   });
});
