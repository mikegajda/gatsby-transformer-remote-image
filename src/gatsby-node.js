const crypto = require(`crypto`)
const Queue = require(`better-queue`)
const { createRemoteFileNode } = require(`gatsby-source-filesystem`)


const remoteimageQueue = new Queue(
  (input, cb) => {
    createRemoteimageNode(input)
      .then(r => cb(null, r))
      .catch(e => cb(e))
  },
  { concurrent: 20, maxRetries: 1, retryDelay: 1000 }
)

const createContentDigest = obj =>
  crypto
    .createHash(`md5`)
    .update(JSON.stringify(obj))
    .digest(`hex`)

exports.onPreBootstrap = (
  { store, cache, actions, createNodeId, getNodes },
  pluginOptions
) => {
  const { createNode, touchNode } = actions
  const remoteimageNodes = getNodes().filter(n => n.internal.type === `Remoteimage`)

  if (remoteimageNodes.length === 0) {
    return null
  }

  let anyQueued = false

  remoteimageNodes.forEach(n => {
    anyQueued = true
    remoteimageQueue.push({
      url: n.url,
      parent: n.parent,
      store,
      cache,
      createNode,
      createNodeId,
    })
  })

  if (!anyQueued) {
    return null
  }

  return new Promise((resolve, reject) => {
    remoteimageQueue.on(`drain`, () => {
      resolve()
    })
  })
}

exports.onCreateNode = async ({
  node,
  actions,
  store,
  cache,
  createNodeId,
}) => {
  const { createNode, createParentChildLink } = actions

  //console.log("node.internal.type=", node.internal.type)

  // Only get MarkdownRemark nodes
  if (node.internal.type !== `MarkdownRemark`) {
    return
  } else {
    if (!node.frontmatter.remoteImage) {
      return
    }
    console.log("has remoteImage")
  }

  const remoteimageNode = await new Promise((resolve, reject) => {
    remoteimageQueue
      .push({
        url: node.frontmatter.remoteImage,
        parent: node.id,
        store,
        cache,
        createNode,
        createNodeId,
      })
      .on(`finish`, r => {
        resolve(r)
      })
      .on(`failed`, e => {
        reject(e)
      })
  })

  createParentChildLink({
    parent: node,
    child: remoteimageNode,
  })
}

const createRemoteimageNode = async ({
  url,
  parent,
  store,
  cache,
  createNode,
  createNodeId,
}) => {
  try {

    // let randomNumber = Math.floor(Math.random() * 100);
    // let ext = url.split(".").slice(-1)[0]
    // let randomizedUrl = url + "?v=" + randomNumber.toString() + "." + ext;
    // console.log("randomizedUrl", randomizedUrl)

    const fileNode = await createRemoteFileNode({
      url,
      store,
      cache,
      createNode,
      createNodeId,
    })


    // if (!fileNode) {
    //   throw new Error(`Remote file node is null`)
    // }

    const remoteimageNode = {
      id: createNodeId(`${parent} >>> Remoteimage`),
      url,
      parent,
      children: [],
      internal: {
        type: `Remoteimage`,
      },
      image___NODE: fileNode.id,
    }

    remoteimageNode.internal.contentDigest = createContentDigest(remoteimageNode)

    createNode(remoteimageNode)

    return remoteimageNode
  } catch (e) {
    console.log(`Failed to remoteimage ${url} due to ${e}. Retrying...`)

    throw e
  }
}
