$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedStories = $("#favorited-articles")
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $author = $("#author");
  const $title = $("#title");
  const $url = $("#url");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance and save info to localstorage
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
   
    // set the global user to the user instance
    currentUser = userInstance;
    // set token and username to localstorage
    syncCurrentUserToLocalStorage(currentUser);
    loginAndSubmitForm();
  });


  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser; //set global currentUser variable to newUser
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage 
    localStorage.clear(); 
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() { 
    hideElements();
    await generateStories();
    $allStoriesList.show();

  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    let currentUser = await User.getLoggedInUser(token, username);
    
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username); 
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms using the jQuery trigger method and the the javascript reset event
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar to include favorites, submit, and user-stories
    showNavForLoggedInUser();
  }


  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story.storyId) ? "fas" : "far";

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * Starring favorites event handler
   *
   */

  $(".articles-container").on("click", ".star", async function(evt) {
    console.log("clicked on a star")
    console.log("209", currentUser)
    if (currentUser) { // if logged in
      console.log("logged in check!")
      const $tgt = $(evt.target); // star 
      console.log("tgt", $tgt)
      const $closestStoryLi = $tgt.closest("li"); // get the story li next to the star
      const storyId = $closestStoryLi.attr("id"); // get that story's Id

      // if the story has already been added to favorites
      if ($tgt.hasClass("fas")) {
        // remove the favorite from the user's list
        await currentUser.removeFromFavorites(storyId);
        // change the star's class back to being empty
        $tgt.toggleClass("fas far");
      } else {
        // add the story to currentUser's Favorites
        await currentUser.addToFavorites(storyId);
        $tgt.toggleClass("fas far");
      }
    }
  });


  function showMyStories() {
    if (currentUser) {
      $favoritedStories.empty()
      $ownStories.empty() //clear existing ownStories list before populating updated ownStories list
      if (currentUser.ownStories.length === 0) {
        $ownStories.append("<h1> No stories yet </h1>");
      } else {
        // for each of the users stories
        for (let story of currentUser.ownStories) {
          // create the storie's HTML
          let ownStoryHTML = generateStoryHTML(story);
          // append each stories HTML to the $ownStories ul
          $ownStories.prepend(ownStoryHTML);
        }
      }
      $allStoriesList.hide()
      generateStories()
      $ownStories.show()
    }
      
  }
  
  function showMyFavorites() {
    checkIfLoggedIn()
    if (currentUser) {
      // empty out existing list so we aren't compounding the list
      $favoritedStories.empty();

      // if no stories have been favorited
      if (currentUser.favorites.length === 0) {
        $favoritedStories.append("<h5>No favorites yet!</h5>");
      } else {
        // for each story of the favorite Stories
        for (let story of currentUser.favorites) {
          // create HTML and add to DOM each story 
          let favoriteStoryHTML = generateStoryHTML(story);
          $favoritedStories.append(favoriteStoryHTML);
        }
      }
    }
    
  }

  // check if story is one of the favorites
  function isFavorite(id) {
    if (currentUser) {
      favoritesList = currentUser.favorites
      favoriteIds = favoritesList.map(story => story.storyId)
      return favoriteIds.includes(id) //returns true if storyId is one of the favorites
    }
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    $(".main-nav-links, #user-profile").toggleClass("hidden");
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  // User submitting new story

  $navSubmit.on('click', function() {
    $submitForm.slideToggle(); //slide submit form down
  })

  $submitForm.on('submit', async function(evt) {
    evt.preventDefault();
    //get submited info from user input
    const author = $author.val()
    const title = $title.val()
    const url = $url.val()
    //const hostname = getHostName(url)
    const username = currentUser.username

    // using addStory method, save new story to storyObject (this method also adds story to user.ownStories)
    const storyObject = await storyList.addStory(currentUser, {
      title, author, url, username
    });


    $submitForm.slideToggle() // hide submit form
    generateStories() // re-load stories including new submitted story
    //clear form values
    $author.val("")
    $title.val("")
    $url.val("")

    return storyObject

  })

  $("#nav-my-stories").on("click", function() {
      showMyStories();
      $ownStories.show();
      $submitForm.hide() // if submitForm is toggled down, hide when 
  })

  $("#nav-favorites").on("click", function() {
    hideElements();
    showMyFavorites();
    $favoritedStories.show();
  })
  
});
