document.addEventListener("DOMContentLoaded",function(){var e=document.getElementById("chatinput-form"),a=document.querySelector("#chat-input"),t=document.querySelector("#conversation-list"),r=document.getElementsByClassName("contacts-link"),o=document.querySelector(".chat-body"),n=document.querySelector("[data-close]"),i=document.getElementsByClassName("username"),d=document.getElementsByClassName("user-avatar"),s=document.getElementsByClassName("chat-item"),c=document.getElementById("active-chat-user"),l=1,m=["Hi","Hello !","Hey :)","How do you do?","Are you there?","I am doing good :)","Hi can we meet today?","How are you?","May I know your good name?","I am from codescandy","Where are you from?","What's Up!"],u=(Array.from(r).forEach(function(e){e.addEventListener("click",function(e){o.classList.add("chat-body-visible")})}),n.addEventListener("click",function(e){o.classList.remove("chat-body-visible")}),document.body.contains(n)&&n.addEventListener("click",function(e){o.classList.remove("chat-body-visible")}),Array.from(s).forEach(function(s){s.addEventListener("click",function(e){var a=s.querySelector("img").parentNode.className,t=s.querySelector("img").src,r=s.querySelector("h5").innerHTML,o=s.querySelector("small"),n=a.split(" ");n=(n=n[n.length-1].split("-"))[1].slice(0,1).toUpperCase()+n[1].slice(1).toLowerCase(),c.querySelector("h4").innerHTML=r,c.querySelector("img").src=t,c.querySelector("img").parentNode.className=a,c.querySelector("p").innerHTML=n,null!==o&&o.nextElementSibling&&o.parentElement.removeChild(o.nextElementSibling),Array.from(i).forEach(function(e){e.innerHTML=r}),Array.from(d).forEach(function(e){e.src=t})})}),document.body.contains(e)&&e.addEventListener("submit",function(e){e.preventDefault();e=(e=new Date).getHours()+":"+e.getMinutes();t.insertAdjacentHTML("beforeend",'<div class="flex justify-end mb-4" id="chat-item-'+l+`">
      <div class="flex">
          <div class=" mr-3 text-right">
              <small>`+e+`</small>
              <div class="flex">
                  <div class="mr-2 mt-2">
                      <div class="dropdown dropstart">
                          <a class="btn rounded-full h-8 w-8 flex items-center gap-x-2 bg-transparent text-gray-600 border-transparent border disabled:opacity-50 disabled:pointer-events-none hover:text-gray-800 hover:bg-gray-300 hover:border-gray-300 active:bg-gray-300 active:border-gray-300 active:text-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 btn-sm" href="#!" role="button"
                              id="dropdownMenuLinkTwo" data-bs-toggle="dropdown"
                              aria-haspopup="true" aria-expanded="false">
                                <i  data-feather="more-vertical" ></i>
                          </a>
                          <div class="dropdown-menu" aria-labelledby="dropdownMenuLinkTwo">
                              <a class="dropdown-item" href="#!">
                                <i class="h-3 w-3" data-feather="copy" ></i>Copy</a>
                              <a class="dropdown-item" href="#!">
                                <i class="h-3 w-3" data-feather="edit" ></i> Edit</a>
                              <a class="dropdown-item" href="#!">
                                <i class="h-3 w-3" data-feather="corner-up-right" ></i>Reply</a>
                              <a class="dropdown-item" href="#!">
                                <i class=" h-3 w-3" data-feather="corner-up-left" ></i>Forward</a>
                              <a class="dropdown-item" href="#!">
                                <i class="h-3 w-3" data-feather="star" ></i>Favourite</a>
                              <a class="dropdown-item" href="#!">
                                <i class="h-3 w-3" data-feather="trash" ></i>Delete
                              </a>
                          </div>
                      </div>
                  </div>
                  <div
                      class="card mt-2 md:rounded-t bg-indigo-600 text-white">
                      <div class="card-body text-left p-3">
                          <p class="">`+a.value+`</p>
                      </div>
                  </div>
              </div>
          </div>
          <img src="./assets/images/avatar/avatar-11.jpg" alt="Image" class="rounded-full h-6 max-w-6" />
      </div>
  </div>`),t.scrollTop=t.scrollHeight,feather.replace(),u(),l++}),function(){newRandomMsg=m[Math.floor(Math.random()*m.length)],a.value=newRandomMsg});u()});