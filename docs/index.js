/**
 * GitHub visualization
 *
 * @author Daniel Sahlin (Hatt3n) and Christian Stjernberg (christian-stj)
 * @version 2020-04-20
 */


const octokit = new Octokit();
// octokit.repos.get
// octokit.repos.listBranches

const ownerFieldId = '#ownerField';
const repoFieldId = '#repoField';

let canvas;
let commitMenu;
let simulation;

const canvasWidth = 1500;
const canvasHeight = 900;
const commitsBack = 30; // Number of commits backwards to include
const issuesBack = 20; // Number of issues to fetch

const getRepo = () => {
  const ownerStr = d3.select(ownerFieldId).property('value');
  const repoStr = d3.select(repoFieldId).property('value');

  if (ownerStr && repoStr) {
    octokit.repos.listCommits({
      owner: ownerStr,
      repo: repoStr,
      per_page: commitsBack,
    }).then(({data}) => {
      if (canvas) {
        canvas.remove();
      }
      if (commitMenu) {
        commitMenu.remove();
      }
      canvas = addCanvas();
      commitMenu = addCommitMenu(ownerStr, repoStr, data);

      // Get issues
      getIssues(ownerStr, repoStr);
      simulation = setupSimulation();
      getTree(ownerStr, repoStr,
          data[0].commit.tree.sha, doubleSimulation);
    });
  }
};

var dark = false;
let blackStr = ';background-color: black;color:white;';
let whiteStr = ';background-color: white;color:black;';

const toggleDarkMode = () => {
  dark = !dark;
  if (dark) {
    d3.select('body').attr('style', blackStr);
    setElemsToBlack(d3.selectAll('div'));
    setElemsToBlack(d3.selectAll('button'));
    setElemsToBlack(d3.selectAll('text'));
  } else {
    d3.select('body').attr('style', whiteStr);
    setElemsToWhite(d3.selectAll('div'));
    setElemsToWhite(d3.selectAll('button'));
    setElemsToWhite(d3.selectAll('text'));
  }
};



const setElemsToBlack = (elems) => {
  elems.each(function() {
    var thisElem = d3.select(this);
    var elemStyle = thisElem.attr('style');
    if (elemStyle)
      thisElem.attr('style', elemStyle.replace(whiteStr,blackStr));
  });
};

const setElemsToWhite = (elems) => {
  elems.each(function() {
    var thisElem = d3.select(this);
    var elemStyle = thisElem.attr('style');
    if (elemStyle)
      thisElem.attr('style', elemStyle.replace(blackStr,whiteStr));
  });
};

const getBackgroundColor = () => {
  if (dark)
    return blackStr;
  return whiteStr;
}

// NOTE: Clarify usefulness of doing this.
const doubleSimulation = (d) => {
  simulation(d);
  simulation(d);
};

const getIssues = (owner, repo) => {
  octokit.issues.listForRepo({
    owner,
    repo,
  }).then(({data}) => {
    console.log('Issues: ', data);
    addIssueMenu(data);
  });
};

let borderStyle = 'border-style: solid; border-width: 2px; border-radius: 5px; border-color: grey;';
let titleBorderStyle = 'border-style: none; border-width: 0px;';
let internalBorderStyle = 'border-style: solid; border-width: 1px; border-radius: 2px; border-color: lightgrey';

const addIssueMenu = (data) => {
  const tmpMen =
    d3.select('body')
        .append('div')
        .attr('style', `float: right; overflow-y: auto; width: 200px; height: 200px;
        position: absolute; margin-top: 210px;`+borderStyle+getBackgroundColor());

  tmpMen.append('text').text('Issue List')
      .attr('style', `display:block;font-family: "Helvetica Neue", Helvetica,
      sans-serif;font-size:20px; background-color: #fff;width:200px;
      font-weight:bold;text-align:center;`+titleBorderStyle+getBackgroundColor());
  // Setup data for D3.
  const count = 0;
  const dataArr = [];
  for (let i = 0; i < data.length && i < issuesBack; ++i) {
    if (count > issuesBack) {
      break;
    }
    dataArr.push({
      'title': '#'+data[i].number+' '+data[i].title,
      'people': data[i].assignees,
    });
  }
  // Add text from processed data.
  tmpMen.selectAll('button')
      .data(dataArr)
      .enter()
      .append('button')
      .text((d) => d.title)
      .attr('style', `display:block; background-color: #fff;font-size:15px;
      width:200px;`+internalBorderStyle+getBackgroundColor())
      .on('mouseover', function(d) {
        showAssigneesBox(d.people, 'Assignees');
      })
      .on('mouseout', function(d) {
        hideAssigneesBox();
      });
  return tmpMen;
};

const showAssigneesBox = (assignees, titleText) => {
  const tmpMen =
    d3.select('body')
        .append('div')
        .attr('id', 'thabox')
        .attr('style', `float:right;overflow-y:auto;width:200px;height:200px;
        position:absolute;margin-top:420px;`+borderStyle+getBackgroundColor());

  tmpMen.append('text').text(titleText)
      .attr('style', `display:block;font-family: "Helvetica Neue", Helvetica,
      sans-serif;font-size:20px; background-color: #fff;width:200px;
      font-weight:bold;text-align:center;`+titleBorderStyle+getBackgroundColor());

  // Setup data for D3.
  const dataArr = [];
  for (let i = 0; i < assignees.length; ++i) {
    dataArr.push({
      'link': assignees[i],
    });
  }
  // Add text from processed data.
  tmpMen.selectAll('img')
      .data(assignees)
      .enter()
      .append('img')
      .text((d) => d.login)
      .attr('src', (d) => d.avatar_url)
      .attr('style', `display:block; width:200px;`+internalBorderStyle);
};

const hideAssigneesBox = () => {
  d3.selectAll('[id=thabox]').remove();
};

const updateVisualElements = (ownerStr, repoStr, treeSha) => {
  // Update canvas-elements for the provided tree sha.
  getTree(ownerStr, repoStr, treeSha, simulation);
};

const addCanvas = () => {
  return d3.select('#container')
      .append('svg')
      .attr('viewbox', [0, 0, canvasWidth, canvasHeight])
      .attr('width', canvasWidth)
      .attr('height', canvasHeight)
      .attr('style', 'position:absolute;'+borderStyle);
};

let msgCharLimit = 60;

const addCommitMenu = (ownerStr, repoStr, data) => {
  const tmpMen =
    d3.select('body')
        .append('div')
        .attr('style', `float:right;overflow-y:auto;width:200px;height:200px;
        position:absolute;`+borderStyle+getBackgroundColor());
  let i;

  tmpMen.append('text').text('Commit List')
      .attr('style', `display:block;font-family: "Helvetica Neue", Helvetica,
      sans-serif;font-size:20px; background-color: #fff;width:200px;
      font-weight:bold;text-align:center;`+titleBorderStyle+getBackgroundColor());

  // Setup data for D3.
  const dataArr = [];
  for (i = 0; i < data.length && i < commitsBack; ++i) {
    dataArr.push({
      'sha': data[i].commit.tree.sha,
      'msg': data[i].commit.message.length > msgCharLimit ? data[i].commit.message.substring(0,msgCharLimit)+'...' : data[i].commit.message,
      'aut': [data[i].author],
    });
  }
  // Add buttons from processed data.
  tmpMen.selectAll('button')
      .data(dataArr)
      .enter()
      .append('button')
      .text((d) => d.msg)
      .attr('style', `display:block; background-color: #fff;font-size:15px;
      width:200px;`+internalBorderStyle+getBackgroundColor())
      .on('click', (d) => {
        updateVisualElements(ownerStr, repoStr, d.sha);
      })
      .on('mouseover', function(d) {
        showAssigneesBox(d.aut, 'By: ' + d.aut[0].login);
      })
      .on('mouseout', function(d) {
        hideAssigneesBox();
      });
  return tmpMen;
};

const getTree = (owner, repo, sha, callback) => {
  octokit.git.getTree({
    owner: owner,
    repo: repo,
    tree_sha: sha,
  }).then(({data}) => {
    console.log(data.tree);

    const repoData = {
      'nodes': [
        {'id': '/', 'group': 0},
      ],
      'links': [
      ],
    };


    getData(owner, repo, sha, repoData, callback).then(() => {
      console.log(repoData);
    });
  });
};

const getParentPath = (fullPath) => {
  const lastSlash = fullPath.lastIndexOf('/');
  let parentPath;
  if (lastSlash < 0) {
    parentPath = '/';
  } else {
    parentPath = fullPath.substring(0, lastSlash);
  }
  return parentPath;
};

const getData = async (owner, repo, sha, repoData, callback) => {
  octokit.git.getTree({
    owner: owner,
    repo: repo,
    tree_sha: sha,
    recursive: 1,
  }).then(({data}) => {
    console.log(data);
    data.tree.forEach((file) => {
      const fullPath = file.path;
      let parentPath = getParentPath(fullPath);
      let slashCount = 1;
      let i;
      for (i = 0; i < fullPath.length; ++i) {
        if (fullPath.charAt(i) == '/') {
          ++slashCount;
        }
      }

      if (document.getElementById('hideFiles').checked === false ||
        file.type === 'tree') {
        repoData.nodes.push({
          'id': fullPath,
          'group': slashCount,
        });
        repoData.links.push({
          'source': parentPath,
          'target': fullPath,
          'value': 10,
        });
      }
    });
    callback(repoData);
  });
};

/* Painting n stuff */

// The following code is based on https://bl.ocks.org/mbostock/2675ff61ea5e063ede2b5d63c08020c7
// by Mike Bostock. License: https://opensource.org/licenses/GPL-3.0
// Modified 2020-04-17
setupSimulation = () => {
  const scale = d3.scaleOrdinal(d3.schemeSpectral[9]);

  const svg = canvas;
  const width = +svg.attr('width');
  const height = +svg.attr('height');

  const simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id(function(d) {
        return d.id;
      }))
      .force('charge', d3.forceManyBody().distanceMin(7).distanceMax(800))
      .force('collision', d3.forceCollide(12).strength(0.4))
      .force('center', d3.forceCenter(width / 2, height / 2));

  let link = svg.append('g')
      .attr('stroke', '#bbb')
      .selectAll('line');


  let node = svg.append('g')
      .attr('pointer-events', 'all')
      .attr('stroke', 'none')
      .attr('stroke-width', '7px') // Defines how big the hitbox is
      .selectAll('circle');

  function ticked() {
    link
        .attr('x1', function(d) {
          return d.source.x;
        })
        .attr('y1', function(d) {
          return d.source.y;
        })
        .attr('x2', function(d) {
          return d.target.x;
        })
        .attr('y2', function(d) {
          return d.target.y;
        });

    node
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        });
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  svg.call(d3.zoom()
      .extent([[0, 0], [canvasWidth, canvasHeight]])
      .scaleExtent([0.3, 8])
      .on('zoom', zoomed));

  function zoomed() {
    node.attr('transform', d3.event.transform);
    link.attr('transform', d3.event.transform);
  }

  return ({nodes, links}) => {
    const old = new Map(node.data().map((d) => [d.id, d]));
    nodes = nodes.map((d) => {
      let oldDataForNode = old.get(d.id);
      if (oldDataForNode) {
        return Object.assign(oldDataForNode, d);
      }
      if (d.id != '/') {
        var parentPath = getParentPath(d.id);
        var oldParentData;
        while (parentPath && !(oldParentData = old.get(parentPath))) {
          if (parentPath == '/')
            break;
          parentPath = getParentPath(parentPath);
        }
        if (oldParentData) {
          d.x = oldParentData.x;
          d.y = oldParentData.y;
        }
      }
      return Object.assign({}, d);
    });

    let transform = d3.zoomTransform(svg.node());

    node = node.data(nodes, (d) => d.id)
        .join((enter) => {
          var tmp = enter.append('circle')
              .attr('fill', 'green')
              .attr('transform', transform)
              .attr('r', '1');
          tmp.call(d3.drag()
                  .on('start', dragstarted)
                  .on('drag', dragged)
                  .on('end', dragended));
          tmp.transition()
              .duration(900)
              .attr('r', (d) => {
                if (d.group < 6) {
                  return 18/(Math.sqrt(d.group+1));
                } else {
                  return 7;
                }
              });
          return tmp;
        },
        (update) => update.attr('fill', (d) => {
          return scale(d.group);
        }),
        (exit) => exit.transition()
            .duration(1300)
            .attr('r', 0)
            .attr('fill', 'red')
            .remove());

    node.append('title')
        .text(function(d) {
          return d.id;
        });

    link = link
        .data(links)
        .join((enter) => enter.append('line'),
            (update) => update.attr('stroke', '#aaa'),
            (exit) => exit.remove()).attr('transform', transform);


    simulation.nodes(nodes).on('tick', ticked);
    simulation.force('link').links(links);
    simulation.alpha(1).restart();
  };
};
