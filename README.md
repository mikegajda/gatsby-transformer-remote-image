# gatsby-transformer-remote-image

Looks for `MarkdownRemark` nodes that have a `remoteImage` property. If that is found, it will try to download the image and add it as a childRemoteimage node of the original MarkdownRemark node (additing it directly to frontmatter was tricky). Use it for things like adding Pixabay images to your Markdown posts

# Installation
`npm install --save gatsby-transformer-remote-image`

# Usage and Configuration
At this time there are no configuration options

# example query
```
{
  allFile(filter: {internal: {mediaType: {in: ["text/markdown"]}}}) {
    edges {
      node {
        id: absolutePath
        remark: childMarkdownRemark {
          id
          childRemoteimage {
            id
            image {
              childImageSharp {
                fluid(maxWidth: 738) {
                  tracedSVG
                  aspectRatio
                  src
                  srcSet
                  srcWebp
                  srcSetWebp
                  sizes
                }
              }
            }
          }
          frontmatter{
            title
          }
        }
      }
    }
  }
}
```