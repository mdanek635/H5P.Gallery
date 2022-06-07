/**
 * Gallery modul.
 *
 * @param {H5P.jQuery} $
 */
H5P.Gallery = (function ($) {
  C.counter = 0;
  var numberOfStory = 0;
  /**
   * Inicijalizacija modula.
   */
  function C(options, id) {
    H5P.EventDispatcher.call(this);
    this.answers = [];
    this.numAnswered = 0;
    this.contentId = this.id = id;
    this.options = $.extend(
      {},
      {
        description: "Galerija edukativnih priča.",
        progressText: "Stranica @card od ukupno @total",
        next: "Sljedeća",
        previous: "Prethodna",
      },
      options
    );
    this.$images = [];
    this.hasBeenReset = false;

    this.on("resize", this.resize, this);
  }

  C.prototype = Object.create(H5P.EventDispatcher.prototype);
  C.prototype.constructor = C;

  /**
   * Funkcija attach učitava priče i sprema ih u this.$images
   *
   * @param {H5P.jQuery} $container
   */
  C.prototype.attach = function ($container) {
    var that = this;

    if (this.isRoot()) {
      this.setActivityStarted();
    }

    this.$container = $container
      .addClass("h5p-gallery")
      .html('<div class="h5p-loading">Loading, please wait...</div>');

    // Učitavamo slike (moramo im dohvatiti veličinu prije nego što ih spremimo.)
    var loaded = 0;
    var load = function () {
      loaded++;
      if (loaded === that.options.cards[numberOfStory].stories.length) {
        that.cardsLoaded();
      }
    };
    for (var i = 0; i < this.options.cards[numberOfStory].stories.length; i++) {
      var card = this.options.cards[numberOfStory].stories[i];

      if (card.image !== undefined) {
        const $image = $("<img>", {
          class: "h5p-clue",
          src: H5P.getPath(card.image.path, this.id),
        });
        if (card.imageAltText) {
          $image.attr("alt", card.imageAltText);
        }

        if ($image.get().complete) {
          load();
        } else {
          $image.on("load", load);
        }

        this.$images[i] = $image;
      } else {
        this.$images[i] = $('<div class="h5p-clue"></div>');
        load();
      }
    }
    //pomoćne funkcije kojima dodajemo izbornik i postavke
    this.listOfStories();
    this.settings();
  };

  /**
   * Poziva se nakon što se sve stranice priče učitaju
   */
  C.prototype.cardsLoaded = function () {
    var that = this;
    var counter = 0;

    //dohvaćamo gumbe za izbornik
    var buttons = this.options.cards.map(function (story) {
      var title = counter;
      var returning =
        '<a><button class="list" id="' +
        title +
        '" title="">' +
        story.titleOfStory +
        "</button></a>";
      counter++;
      return returning;
    });

    //postavlja okvir za unutarnji container
    var $inner = this.$container
      .html(
        '<div class="dropdown" style="float:left;">' +
          '<button class="dropbtn">Menu</button>' +
          '<div class="dropdown-content" style="left:0;">' +
          buttons.join("") +
          "</div>" +
          "</div>" +
          '<button data-js="open" id="settings" type="button" class="fa fa-cog settings-button" aria-hidden="true" tabindex="0" title="Postavke"></button>' +
          '<div class="popup">' +
          "<div>" +
          '<p> Veličina fonta </p><button id="increase" class="button-in-settings">+</button>' +
          '<button id="decrease" class="button-in-settings">-</button>' +
          "</div>" +
          '<p> Kontrast </p><a class="toggler off">&nbsp;</a>' +
          "<div>" +
          "<p> Veličina slova </p>" +
          '<button id="big-letters" class="button-in-settings">VELIKA</button>' +
          '<button id="small-letters" class="button-in-settings">mala</button>' +
          "</div>" +
          "<div>" +
          "<p> Tekst ispod slike </p>" +
          '<button id="show" class="button-in-settings">Pokaži</button>' +
          '<button id="hide" class="button-in-settings">Sakrij</button>' +
          "</div>" +
          "<div>" +
          '<button name="close" class="button-in-settings">Zatvori</button>' +
          "</div>" +
          "</div>" +
          '<div class="h5p-progress"></div>' +
          '<div class="h5p-inner" role="list"></div>' +
          '<div class="h5p-navigation">' +
          '<button type="button" id="previous" class="h5p-button h5p-previous h5p-hidden" tabindex="0" title="' +
          this.options.previous +
          '" aria-label="' +
          this.options.previous +
          '"></button>' +
          '<button type="button" id="next" class="h5p-button h5p-next" tabindex="0" title="' +
          this.options.next +
          '" aria-label="' +
          this.options.next +
          '"></button>' +
          '<audio class="sound1" src="" ></audio>'
      )
      .children(".h5p-inner");

    // Stvaramo vizualni napredak (progress bar)
    this.$visualProgress = $("<div/>", {
      class: "h5p-visual-progress",
      role: "progressbar",
      "aria-valuemax": "100",
      "aria-valuemin": (
        100 / this.options.cards[numberOfStory].stories.length
      ).toFixed(2),
    })
      .append(
        $("<div/>", {
          class: "h5p-visual-progress-inner",
        })
      )
      .appendTo(this.$container);

    this.$progress = this.$container.find(".h5p-progress");

    // Dodajemo stranice priče
    for (var i = 0; i < this.options.cards[numberOfStory].stories.length; i++) {
      this.addCard(i, $inner);
    }

    // Postavljamo priču koja se trenutno prikazuje
    this.setCurrent($inner.find(">:first-child"));

    //Prilagodi visinu zadatka priči
    var height = 0;
    for (i = 0; i < this.$images.length; i++) {
      var $image = this.$images[i];

      if ($image === undefined) {
        continue;
      }

      var imageHeight = $image.height();
      if (imageHeight > height) {
        height = imageHeight;
      }
    }

    //Prilagodi aktivne gumbe
    var $buttonWrapper = $inner.next();
    this.$nextButton = $buttonWrapper.children(".h5p-next").click(function () {
      that.next();
    });
    this.$prevButton = $buttonWrapper
      .children(".h5p-previous")
      .click(function () {
        that.previous();
      });

    if (this.options.cards[numberOfStory].stories.length < 2) {
      this.$nextButton.hide();
    }

    this.$current.next().addClass("h5p-next");

    $inner.initialImageContainerWidth = $inner
      .find(".h5p-imageholder")
      .outerWidth();

    this.$inner = $inner;
    this.setProgress();
    this.trigger("resize");

    this.$ariaAnnouncer = $("<div>", {
      class: "hidden-but-read",
      "aria-live": "assertive",
      appendTo: this.$container,
    });
    this.$pageAnnouncer = $("<div>", {
      class: "hidden-but-read",
      "aria-live": "assertive",
      appendTo: this.$container,
    });

    // Postavi prvu stranicu ako je priča bila resetirana
    if (this.hasBeenReset) {
      // Treba mu mali "timeout" da se stigne resetirati
      setTimeout(function () {}.bind(this), 100);
    }

    this.listOfStories();
    this.settings();
  };

  /**
   * Funkcija settings omogućava prilagodbu i pristupačnost sadržaja
   */
  C.prototype.settings = function () {
    var that = this;

    //popup prozor sa postavkama
    function deselect(e) {
      $(".pop").slideFadeToggle(function () {
        e.removeClass("selected");
      });
    }

    function popupOpenClose(popup) {
      if ($(".wrapper").length == 0) {
        $(popup).wrapInner("<div class='wrapper'></div>");
      }

      $(popup).show();

      $(popup).click(function (e) {
        if (e.target == this) {
          if ($(popup).is(":visible")) {
            $(popup).hide();
          }
        }
      });

      $(popup)
        .find("button[name=close]")
        .on("click", function () {
          if ($(".formElementError").is(":visible")) {
            $(".formElementError").remove();
          }
          $(popup).hide();
        });
    }

    $(document).ready(function () {
      $("[data-js=open]").on("click", function () {
        popupOpenClose($(".popup"));
      });
    });

    $(function () {
      //postavljen settings gumb
      $("#settings").on("click", function () {
        if ($(this).hasClass("selected")) {
          deselect($(this));
        } else {
          $(this).addClass("selected");
          $(".pop").slideFadeToggle();
        }
        return false;
      });

      //dodavanje audio zapisa na priču (čitanje priče)
      $(".h5p-story-overlay").on("click", function () {
        var index = that.$current.index();
        console.log(index);
        var audioPath =
          that.options.cards[numberOfStory].stories[index].audioFile[0].path;
        console.log(audioPath);
        var file = H5P.getPath(audioPath, that.id);
        console.log(file);

        $(".sound1").attr("src", file);

        $(".sound1").get(0).play();
      });

      //služi za zatvaranje popup prozora
      $(".close").on("click", function () {
        deselect($("#settings"));
        return false;
      });

      //povećanje fonta
      $(function () {
        $("#increase").on("click", function () {
          var font = $(".h5p-imagetext").css("font-size");
          console.log(font);
          if (parseInt(font) < 36) {
            $(".h5p-imagetext").css("fontSize", parseInt(font) + 3);
          }
        });
      });
      //smanjenje fonta
      $(function () {
        $("#decrease").on("click", function () {
          var font = $(".h5p-imagetext").css("font-size");
          if (parseInt(font) > 12) {
            $(".h5p-imagetext").css("fontSize", parseInt(font) - 3);
          }
        });
      });
      //pretvori sva slova u mala
      $(function () {
        $("#small-letters").on("click", function () {
          $(".h5p-imagetext").css("text-transform", "lowercase");
        });
      });
      //pretvori sva slova u velika
      $(function () {
        $("#big-letters").on("click", function () {
          $(".h5p-imagetext").css("text-transform", "uppercase");
        });
      });
      //prikaži tekst ispod slike
      $(function () {
        $("#show").on("click", function () {
          $(".h5p-foot").show();
        });
      });
      //sakrij tekst ispod slike
      $(function () {
        $("#hide").on("click", function () {
          $(".h5p-foot").hide();
        });
      });

      //toggler za kontrast
      $(function () {
        $("a.toggler").click(function () {
          $(this).toggleClass("off");
          if (!$("a.toggler").hasClass("off")) {
            $(".h5p-imagetext").css("background", "black");
            $(".h5p-cardholder").css("background", "black");
            $(".h5p-foot").css("background", "black");
            $(".h5p-cardholder").css("border-color", "black");

            $(".h5p-imagetext").css("color", "white");
          } else {
            $(".h5p-imagetext").css("background", "white");
            $(".h5p-cardholder").css("background", "white");
            $(".h5p-foot").css("background", "white");
            $(".h5p-cardholder").css("border-color", "black");

            $(".h5p-imagetext").css("color", "black");
          }
        });
      });

      $.fn.slideFadeToggle = function (easing, callback) {
        return this.animate(
          { opacity: "toggle", height: "toggle" },
          "fast",
          easing,
          callback
        );
      };

      //listanje strelicama
      $(document)
        .off()
        .on("keydown", function (e) {
          if (e.keyCode == 37) {
            // lijeva strelica
            $("#previous").click();
          } else if (e.keyCode == 39) {
            //desna strelica
            $("#next").click();
          }
        });
    });
  };

  /**
   *Funkcija za dodavanje kartice
   */
  C.prototype.addCard = function (index, $inner) {
    var that = this;
    var card = this.options.cards[numberOfStory].stories[index];
    const cardId = ++C.counter;

    // Generiramo html za novu galeriju i dodajemo ga u inner
    var $card = $(
      '<div role="listitem" class="h5p-card h5p-animate' +
        (index === 0 ? " h5p-current" : "") +
        '" aria-hidden="' +
        (index === 0 ? "false" : "true") +
        '"> ' +
        '<div class="h5p-cardholder">' +
        '<div class="h5p-imageholder">' +
        '<div class="h5p-story-overlay">' +
        "</div>" +
        "</div>" +
        '<div class="h5p-foot">' +
        '<div class="h5p-imagetext" id="h5p-story-card-' +
        cardId +
        '">' +
        (card.text !== undefined ? card.text : "") +
        "</div>" +
        '<div class="h5p-answer">' +
        '<div class="h5p-input">' +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>" +
        "</div>"
    ).appendTo($inner);

    $card.find(".h5p-imageholder").prepend(this.$images[index]);

    $card.prepend(
      $('<div class="h5p-story-overlay"></div>').on("click", function () {
        if ($(this).parent().hasClass("h5p-previous")) {
          that.previous();
        } else {
          that.next();
        }
      })
    );

    return $card;
  };

  /* Funkcija za listanje priča kroz izbornik
   */
  C.prototype.listOfStories = function () {
    const fun = (id) => {
      numberOfStory = id;

      this.attach(this.$container);

      this.resetTask();
    };

    $("button").click(function (e) {
      var idClicked = e.target.id;
      if (/^\d+$/.test(idClicked)) {
        fun(idClicked);
      }
    });
  };

  /**
   *Namjesti napredak
   */
  C.prototype.setProgress = function () {
    var index = this.$current.index();
    this.$progress.text(
      index + 1 + " / " + this.options.cards[numberOfStory].stories.length
    );
    this.$visualProgress
      .attr(
        "aria-valuenow",
        (
          ((index + 1) / this.options.cards[numberOfStory].stories.length) *
          100
        ).toFixed(2)
      )
      .find(".h5p-visual-progress-inner")
      .width(
        ((index + 1) / this.options.cards[numberOfStory].stories.length) * 100 +
          "%"
      );
  };

  /**
   *Postavljanje trenutne stranice priče
   */
  C.prototype.setCurrent = function ($card) {
    // Ukloni iz postojeće stranice priče
    if (this.$current) {
      this.$current.find(".h5p-textinput").attr("tabindex", "-1");
      this.$current.find(".joubel-tip-container").attr("tabindex", "-1");
      this.$current.find(".h5p-check-button").attr("tabindex", "-1");
      this.$current.find(".h5p-icon-button").attr("tabindex", "-1");
    }

    // Postavi novu stranicu
    this.$current = $card;

    $card.one(
      "transitionend",
      function () {
        if ($card.hasClass("h5p-current")) {
          $card.find(".h5p-textinput").focus();
        }
        setTimeout(function () {}.bind(this), 500);
      }.bind(this)
    );

    // Ažuriraj stranicu
    $card.removeClass("h5p-previous h5p-next");
    $card.addClass("h5p-current");
    $card.attr("aria-hidden", "false");

    $card
      .siblings()
      .removeClass("h5p-current h5p-previous h5p-next left right")
      .attr("aria-hidden", "true")
      .find(".h5p-rotate-in")
      .removeClass("h5p-rotate-in");

    $card.prev().addClass("h5p-previous");
    $card.next(".h5p-card").addClass("h5p-next");

    $card.prev().prevAll().addClass("left");
    $card.next().nextAll().addClass("right");

    $card.find(".h5p-check-button").attr("tabindex", "0");
    $card.find(".h5p-icon-button").attr("tabindex", "0");
    $card.find(".joubel-tip-container").attr("tabindex", "0");
  };

  /**
   * Prikaži sljedeću stranicu
   */
  C.prototype.next = function () {
    var that = this;
    var $next = this.$current.next();

    clearTimeout(this.prevTimer);
    clearTimeout(this.nextTimer);

    if (!$next.length) {
      return;
    }

    that.setCurrent($next);
    if (!that.$current.next(".h5p-card").length) {
      that.$nextButton.addClass("h5p-hidden");
    }
    that.$prevButton.removeClass("h5p-hidden");
    that.setProgress();

    if (
      $next.is(":last-child") &&
      that.numAnswered == that.options.cards[numberOfStory].stories.length
    ) {
      that.$container.find(".h5p-show-results").show();
    }
  };

  /**
   * Prikaži prethodnu stranicu
   */
  C.prototype.previous = function () {
    var that = this;
    var $prev = this.$current.prev();

    clearTimeout(this.prevTimer);
    clearTimeout(this.nextTimer);

    if (!$prev.length) {
      return;
    }

    that.setCurrent($prev);
    if (!that.$current.prev().length) {
      that.$prevButton.addClass("h5p-hidden");
    }
    that.$nextButton.removeClass("h5p-hidden");
    that.setProgress();
    that.$container.find(".h5p-show-results").hide();
  };

  /**
   * Prikaži posljednju stranicu
   */
  C.prototype.last = function () {
    var $last = this.$inner.children().last();
    this.setCurrent($last);
    this.$nextButton.addClass("h5p-hidden");
    if (this.options.cards[numberOfStory].stories.length > 1) {
      this.$prevButton.removeClass("h5p-hidden");
    }
    this.setProgress();
    this.$container.find(".h5p-show-results").show();
    this.trigger("resize");
  };

  /**
   * Resetiranje cijele priče
   */
  C.prototype.resetTask = function () {
    this.numAnswered = 0;
    this.hasBeenReset = true;
    this.cardsLoaded();
    this.trigger("resize");
  };

  /**
   *Dohvati autorska prava
   */
  C.prototype.getCopyrights = function () {
    var info = new H5P.ContentCopyrights();

    // Prođi kroz kartice
    for (var i = 0; i < this.options.cards[numberOfStory].stories.length; i++) {
      var image = this.options.cards[numberOfStory].stories[i].image;
      if (image !== undefined && image.copyright !== undefined) {
        var rights = new H5P.MediaCopyright(image.copyright);
        rights.setThumbnail(
          new H5P.Thumbnail(
            H5P.getPath(image.path, this.id),
            image.width,
            image.height
          )
        );
        info.addMedia(rights);
      }
    }

    return info;
  };

  /**
   * Ažuriraj dimenzije slika
   */
  C.prototype.resize = function () {
    var self = this;
    if (self.$inner === undefined) {
      return;
    }
    var maxHeight = 0;
    var maxHeightImage = 0;

    if (this.$inner.width() / parseFloat($("body").css("font-size")) <= 31) {
      self.$container.addClass("h5p-mobile");
    } else {
      self.$container.removeClass("h5p-mobile");
    }

    self.$inner.children(".h5p-card").each(function () {
      var cardholderHeight =
        maxHeightImage + $(this).find(".h5p-foot").outerHeight();
      var $button = $(this).find(".h5p-check-button");
      var $tipIcon = $(this).find(".joubel-tip-container");
      maxHeight = cardholderHeight > maxHeight ? cardholderHeight : maxHeight;

      if ($button.outerWidth() > $button.parent().width() * 0.4) {
        $button.parent().addClass("h5p-exceeds-width");
        $tipIcon.attr("style", "");
      } else {
        $button.parent().removeClass("h5p-exceeds-width");
        $tipIcon.css("right", $button.outerWidth());
      }
    });

    if (this.numAnswered < this.options.cards[numberOfStory].stories.length) {
      var innerHeight = 0;
      this.$inner.children(".h5p-card").each(function () {
        if ($(this).height() > innerHeight) {
          innerHeight = $(this).height();
        }
      });

      this.$inner.height(innerHeight);
    }

    var freeSpaceRight = this.$inner
      .children(".h5p-card")
      .last()
      .css("marginRight");

    if (parseInt(freeSpaceRight) < 160) {
      this.$container
        .find(".h5p-show-results")
        .addClass("h5p-mobile")
        .css("width", "");
    } else if (freeSpaceRight != "auto") {
      this.$container
        .find(".h5p-show-results")
        .removeClass("h5p-mobile")
        .width(freeSpaceRight);
    }
  };

  /**
   * Pomoćna funkcija za konvertiranje html-a u tekst
   */
  C.$converter = $("<div/>");

  return C;
})(H5P.jQuery);
