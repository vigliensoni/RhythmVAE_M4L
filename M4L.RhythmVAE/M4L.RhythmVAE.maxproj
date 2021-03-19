{
	"name" : "M4L.RhythmVAE",
	"version" : 1,
	"creationdate" : 3650640218,
	"modificationdate" : 3698991161,
	"viewrect" : [ 81.0, 484.0, 541.0, 602.0 ],
	"autoorganize" : 0,
	"hideprojectwindow" : 0,
	"showdependencies" : 1,
	"autolocalize" : 0,
	"contents" : 	{
		"patchers" : 		{
			"rhythmvae.maxpat" : 			{
				"kind" : "patcher",
				"toplevel" : 1
			}
,
			"makenote_for_me.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1
			}
,
			"setup_1_16.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1
			}
,
			"visualizer.maxpat" : 			{
				"kind" : "patcher"
			}
,
			"count_for_me.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1
			}
,
			"grid-64.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1
			}
,
			"shuffle_metro.maxpat" : 			{
				"kind" : "patcher",
				"local" : 1
			}

		}
,
		"code" : 		{
			"rhythmvae.js" : 			{
				"kind" : "javascript",
				"singleton" : 				{
					"bootpath" : "~/Documents/3_GitHub/R-VAE",
					"projectrelativepath" : ".."
				}

			}
,
			"constants.js" : 			{
				"kind" : "javascript",
				"local" : 1
			}
,
			"data.js" : 			{
				"kind" : "javascript",
				"local" : 1
			}
,
			"utils.js" : 			{
				"kind" : "javascript",
				"local" : 1
			}
,
			"vae.js" : 			{
				"kind" : "javascript",
				"local" : 1
			}
,
			"visualizer.js" : 			{
				"kind" : "javascript",
				"local" : 1
			}

		}
,
		"other" : 		{
			"M4L.RhythmVAE.maxproj" : 			{
				"kind" : "project",
				"local" : 1
			}

		}

	}
,
	"layout" : 	{

	}
,
	"searchpath" : 	{
		"0" : 		{
			"bootpath" : "~/Documents/3_GitHub/R-VAE/src",
			"projectrelativepath" : "../src",
			"label" : "JS code",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}
,
		"1" : 		{
			"bootpath" : "~/Documents/3_GitHub/R-VAE/subpatches",
			"projectrelativepath" : "../subpatches",
			"label" : "subpatches",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}
,
		"2" : 		{
			"bootpath" : "~/Documents/3_GitHub/R-VAE/node_modules",
			"projectrelativepath" : "../node_modules",
			"label" : "node modules",
			"recursive" : 1,
			"enabled" : 1,
			"includeincollective" : 1
		}

	}
,
	"detailsvisible" : 1,
	"amxdtype" : 1835887981,
	"readonly" : 0,
	"devpathtype" : 0,
	"devpath" : ".",
	"sortmode" : 0,
	"viewmode" : 0
}
